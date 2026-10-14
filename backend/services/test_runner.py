"""Execute generated test artifacts in disposable, network-isolated containers."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tempfile
import threading
import time
from typing import Literal, Mapping, Sequence
from uuid import uuid4


ExecutionStatus = Literal[
    "passed",
    "failed",
    "timed_out",
    "runner_unavailable",
    "execution_error",
]

RUNNER_IMAGE = "ai-engineering-workspace-test-runner:py312-pytest8.3.5"
EXECUTION_TIMEOUT_SECONDS = 30
MAX_OUTPUT_BYTES = 64 * 1024


@dataclass(frozen=True)
class TestExecutionResult:
    status: ExecutionStatus
    stdout: str
    stderr: str
    exit_code: int | None
    duration_ms: int
    message: str | None = None


def _docker_environment() -> dict[str, str]:
    env = {"PATH": os.environ.get("PATH", "")}
    for key in ("SYSTEMROOT", "WINDIR", "TEMP", "TMP"):
        value = os.environ.get(key)
        if value:
            env[key] = value
    return env


def _docker_cli() -> str | None:
    return shutil.which("docker")


def _run_docker_command(
    cli: str,
    args: Sequence[str],
    *,
    timeout: int,
    input_data: bytes | None = None,
) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        [cli, *args],
        input=input_data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
        env=_docker_environment(),
    )


def _ensure_runner_image(cli: str) -> str | None:
    inspect = _run_docker_command(
        cli,
        ["image", "inspect", RUNNER_IMAGE],
        timeout=10,
    )
    if inspect.returncode == 0:
        return None

    with tempfile.TemporaryDirectory(prefix="workspace-runner-image-") as build_dir:
        dockerfile = Path(build_dir) / "Dockerfile"
        dockerfile.write_text(
            "\n".join(
                (
                    "FROM python:3.12.8-slim-bookworm",
                    "RUN python -m pip install --no-cache-dir "
                    "pytest==8.3.5 SQLAlchemy==2.0.36 "
                    "pydantic==2.10.4 fastapi==0.115.6",
                    "RUN useradd --uid 10001 --create-home runner",
                    "USER 10001:10001",
                    "WORKDIR /tmp",
                    "",
                )
            ),
            encoding="utf-8",
        )
        try:
            build = _run_docker_command(
                cli,
                ["build", "--tag", RUNNER_IMAGE, build_dir],
                timeout=180,
            )
        except subprocess.TimeoutExpired:
            return "Timed out while preparing the controlled Python test image."
        if build.returncode != 0:
            detail = (build.stderr or build.stdout).decode("utf-8", errors="replace")
            return f"Could not prepare the controlled Python test image: {detail[-2000:]}"
    return None


def _safe_artifact_path(raw_path: object) -> PurePosixPath:
    if not isinstance(raw_path, str) or not raw_path or "\x00" in raw_path:
        raise ValueError("Artifact path is missing or invalid.")
    if "\\" in raw_path:
        raise ValueError("Artifact paths must use relative POSIX separators.")
    if raw_path.startswith("/"):
        raise ValueError("Artifact paths must be relative.")

    path = PurePosixPath(raw_path)
    if any(part in ("", ".", "..") for part in raw_path.split("/")):
        raise ValueError("Artifact path contains an invalid component.")
    if path.is_absolute() or not path.name.endswith(".py"):
        raise ValueError("Only relative Python artifact paths can be executed.")
    return path


def _write_artifact(
    workspace: Path,
    artifact: Mapping[str, object],
    *,
    require_python: bool,
) -> PurePosixPath:
    path = _safe_artifact_path(artifact.get("path"))
    if require_python and path.suffix != ".py":
        raise ValueError("The test artifact must be a Python file.")
    content = artifact.get("content")
    if not isinstance(content, str):
        raise ValueError(f"Artifact {path} has no text content.")

    destination = workspace.joinpath(*path.parts)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")
    return path


def _capture_bounded(stream, destination: bytearray) -> None:
    while True:
        chunk = stream.read(8192)
        if not chunk:
            return
        remaining = MAX_OUTPUT_BYTES - len(destination)
        if remaining > 0:
            destination.extend(chunk[:remaining])


def _stop_container(cli: str, container_name: str) -> None:
    try:
        _run_docker_command(
            cli,
            ["rm", "--force", container_name],
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        pass


def run_test_artifacts(
    test_artifact: Mapping[str, object],
    source_artifacts: Sequence[Mapping[str, object]],
) -> TestExecutionResult:
    """Run one registered test artifact and Python source dependencies in Docker."""
    cli = _docker_cli()
    if not cli:
        return TestExecutionResult(
            status="runner_unavailable",
            stdout="",
            stderr="",
            exit_code=None,
            duration_ms=0,
            message="Docker is not installed; generated tests were not executed.",
        )

    try:
        daemon_check = _run_docker_command(
            cli,
            ["info", "--format", "{{.ServerVersion}}"],
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return TestExecutionResult(
            status="runner_unavailable",
            stdout="",
            stderr="",
            exit_code=None,
            duration_ms=0,
            message=f"Docker is unavailable; generated tests were not executed: {exc}",
        )
    if daemon_check.returncode != 0:
        detail = daemon_check.stderr.decode("utf-8", errors="replace").strip()
        return TestExecutionResult(
            status="runner_unavailable",
            stdout="",
            stderr=detail,
            exit_code=None,
            duration_ms=0,
            message="Docker daemon is unavailable; generated tests were not executed.",
        )

    try:
        image_error = _ensure_runner_image(cli)
    except (OSError, subprocess.SubprocessError) as exc:
        image_error = f"Unable to prepare the isolated test runner: {exc}"
    if image_error:
        return TestExecutionResult(
            status="runner_unavailable",
            stdout="",
            stderr="",
            exit_code=None,
            duration_ms=0,
            message=image_error,
        )

    container_name = f"workspace-test-{uuid4().hex}"
    try:
        with tempfile.TemporaryDirectory(prefix="workspace-test-") as temp_dir:
            workspace = Path(temp_dir)
            test_path = _write_artifact(workspace, test_artifact, require_python=True)
            written_paths = {test_path}
            for artifact in source_artifacts:
                artifact_type = artifact.get("artifact_type")
                if artifact_type not in {"backend", "database"}:
                    continue
                if not str(artifact.get("path", "")).endswith(".py"):
                    continue
                source_path = _safe_artifact_path(artifact.get("path"))
                if source_path in written_paths:
                    raise ValueError(f"Duplicate artifact path: {source_path}")
                _write_artifact(workspace, artifact, require_python=True)
                written_paths.add(source_path)

            command = [
                cli,
                "run",
                "--rm",
                "--pull=never",
                "--name",
                container_name,
                "--network",
                "none",
                "--read-only",
                "--tmpfs",
                "/tmp:rw,noexec,nosuid,nodev,size=64m,mode=1777",
                "--mount",
                f"type=bind,src={workspace},dst=/workspace,readonly",
                "--workdir",
                "/tmp",
                "--user",
                "10001:10001",
                "--cap-drop",
                "ALL",
                "--security-opt",
                "no-new-privileges",
                "--pids-limit",
                "64",
                "--memory",
                "256m",
                "--memory-swap",
                "256m",
                "--cpus",
                "0.5",
                "--ulimit",
                "cpu=20:20",
                "--ulimit",
                "nofile=64:64",
                "--env",
                "PYTHONDONTWRITEBYTECODE=1",
                "--env",
                "PYTEST_DISABLE_PLUGIN_AUTOLOAD=1",
                "--env",
                "PYTHONNOUSERSITE=1",
                RUNNER_IMAGE,
                "python",
                "-I",
                "-m",
                "pytest",
                "-q",
                "-p",
                "no:cacheprovider",
                f"/workspace/{test_path.as_posix()}",
            ]

            stdout = bytearray()
            stderr = bytearray()
            started = time.monotonic()
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=_docker_environment(),
            )
            assert process.stdout is not None and process.stderr is not None
            stdout_thread = threading.Thread(
                target=_capture_bounded,
                args=(process.stdout, stdout),
                daemon=True,
            )
            stderr_thread = threading.Thread(
                target=_capture_bounded,
                args=(process.stderr, stderr),
                daemon=True,
            )
            stdout_thread.start()
            stderr_thread.start()

            try:
                exit_code = process.wait(timeout=EXECUTION_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired:
                _stop_container(cli, container_name)
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                stdout_thread.join(timeout=2)
                stderr_thread.join(timeout=2)
                return TestExecutionResult(
                    status="timed_out",
                    stdout=stdout.decode("utf-8", errors="replace"),
                    stderr=stderr.decode("utf-8", errors="replace"),
                    exit_code=None,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    message=f"Test execution exceeded {EXECUTION_TIMEOUT_SECONDS} seconds.",
                )

            stdout_thread.join()
            stderr_thread.join()
            out_text = stdout.decode("utf-8", errors="replace")
            err_text = stderr.decode("utf-8", errors="replace")
            if exit_code == 0:
                result_status: ExecutionStatus = "passed"
                message = None
            elif exit_code == 125:
                result_status = "runner_unavailable"
                message = "Docker could not start the isolated test container."
            else:
                result_status = "failed"
                message = "Generated tests exited with a non-zero status."

            return TestExecutionResult(
                status=result_status,
                stdout=out_text,
                stderr=err_text,
                exit_code=exit_code,
                duration_ms=int((time.monotonic() - started) * 1000),
                message=message,
            )
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        _stop_container(cli, container_name)
        return TestExecutionResult(
            status="execution_error",
            stdout="",
            stderr="",
            exit_code=None,
            duration_ms=0,
            message=f"Unable to execute tests in the isolated runner: {exc}",
        )
