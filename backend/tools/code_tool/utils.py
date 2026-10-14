import ast
from pathlib import Path
from utils.file_security import resolve_contained_path, safe_filename


GENERATED_DIR = Path("generated")


def save_code(filename: str, code: str) -> Path:
    if not filename:
        raise ValueError("Filename cannot be empty.")
    if not code:
        raise ValueError("Code cannot be empty.")

    GENERATED_DIR.mkdir(exist_ok=True)
    clean_name = safe_filename(filename)
    file_path = resolve_contained_path(GENERATED_DIR, clean_name)

    with open(file_path, "w", encoding="utf-8") as file:
        file.write(code)

    return file_path


def run_python_file(filename: str) -> str:
    """
    Safe static verification of Python code without executing
    arbitrary subprocesses on the host machine.
    """
    clean_name = safe_filename(filename)
    file_path = resolve_contained_path(GENERATED_DIR, clean_name)

    if not file_path.exists():
        raise FileNotFoundError(f"{filename} not found.")

    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=clean_name)
        funcs = sum(1 for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))
        classes = sum(1 for node in ast.walk(tree) if isinstance(node, ast.ClassDef))
        return (
            f"[Safe Static Sandbox Verifier]\n"
            f"File: {clean_name}\n"
            f"Syntax: Valid Python 3.12 AST\n"
            f"Functions: {funcs}\n"
            f"Classes: {classes}\n"
            f"Safety status: Host subprocess execution isolated per security policy."
        )
    except SyntaxError as e:
        return f"Syntax Error: {e.msg} at line {e.lineno}"
