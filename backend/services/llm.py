"""
LLM Provider Abstraction Layer.

Supports:
- GeminiProvider (default)
- OllamaProvider (future)

Configuration via environment:
    LLM_PROVIDER=gemini
    GEMINI_MODEL=gemini-3.5-flash-lite
"""

import re
import time
import logging
from abc import ABC, abstractmethod
from typing import Optional

from config import LLM_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generate text from a prompt. Returns the generated text."""
        ...

    @abstractmethod
    def provider_name(self) -> str:
        ...

    @abstractmethod
    def model_name(self) -> str:
        ...


class GeminiProvider(LLMProvider):
    """Google Gemini provider using google-genai SDK."""

    _TRANSIENT_STATUS_CODES = {429, 500, 502, 503}
    _MAX_RETRIES = 3

    def __init__(self, api_key: str, model: str):
        from google import genai
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        last_error: Optional[Exception] = None
        for attempt in range(self._MAX_RETRIES):
            try:
                kwargs = {
                    "model": self._model,
                    "contents": prompt,
                }
                if system_instruction:
                    from google.genai import types
                    kwargs["config"] = types.GenerateContentConfig(
                        system_instruction=system_instruction
                    )
                response = self._client.models.generate_content(**kwargs)
                if response.text:
                    return response.text.strip()
                return ""
            except Exception as e:
                last_error = e
                transient = self._is_transient_error(e)
                logger.warning(
                    "Gemini request failed (attempt %d/%d, transient=%s): %s",
                    attempt + 1,
                    self._MAX_RETRIES,
                    transient,
                    e,
                )
                if not transient or attempt == self._MAX_RETRIES - 1:
                    raise RuntimeError(self._format_error(e, retried=transient)) from e
                backoff = 0.5 * (2 ** attempt)
                time.sleep(backoff)
        raise RuntimeError(
            f"Gemini generation failed after {self._MAX_RETRIES} attempts: {last_error}"
        ) from last_error

    def _error_status_code(self, exc: Exception) -> Optional[int]:
        for attr in ("status_code", "code"):
            value = getattr(exc, attr, None)
            if isinstance(value, int):
                return value
        response = getattr(exc, "response", None)
        if response is not None:
            value = getattr(response, "status_code", None)
            if isinstance(value, int):
                return value
        return None

    def _is_transient_error(self, exc: Exception) -> bool:
        status = self._error_status_code(exc)
        if status is not None:
            return status in self._TRANSIENT_STATUS_CODES
        text = str(exc)
        text_upper = text.upper()
        if any(token in text_upper for token in ("RESOURCE_EXHAUSTED", "UNAVAILABLE")):
            return True
        return bool(
            re.search(r"\b(429|500|502|503)\b", text)
        )

    def _format_error(self, exc: Exception, retried: bool) -> str:
        status = self._error_status_code(exc)
        text = str(exc)
        text_upper = text.upper()
        model = self._model
        if retried:
            return (
                f"Gemini generation failed after {self._MAX_RETRIES} attempts "
                f"for model '{model}' (transient error): {exc}"
            )
        if status == 404 or "NOT_FOUND" in text_upper or re.search(r"\b404\b", text):
            return (
                f"Gemini model not found (404) for model '{model}': {exc}. "
                "Check GEMINI_MODEL. This error is not retried."
            )
        if (
            status in (401, 403)
            or "UNAUTHENTICATED" in text_upper
            or "PERMISSION_DENIED" in text_upper
            or "INVALID API KEY" in text_upper
            or "API_KEY_INVALID" in text_upper
        ):
            return (
                f"Gemini authentication failed: {exc}. "
                "Check GEMINI_API_KEY. This error is not retried."
            )
        return f"Gemini generation failed for model '{model}': {exc}"

    def provider_name(self) -> str:
        return "gemini"

    def model_name(self) -> str:
        return self._model


class OllamaProvider(LLMProvider):
    """
    Ollama provider (future).
    Requires Ollama running locally.
    """

    def __init__(self, model: str = "llama3", base_url: str = "http://localhost:11434"):
        self._model = model
        self._base_url = base_url

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        import requests
        payload = {"model": self._model, "prompt": prompt, "stream": False}
        if system_instruction:
            payload["system"] = system_instruction
        try:
            resp = requests.post(f"{self._base_url}/api/generate", json=payload, timeout=120)
            resp.raise_for_status()
            return resp.json().get("response", "").strip()
        except Exception as e:
            raise RuntimeError(f"Ollama generation failed: {str(e)}") from e

    def provider_name(self) -> str:
        return "ollama"

    def model_name(self) -> str:
        return self._model


class DeterministicProvider(LLMProvider):
    """Offline-safe fallback used when a live provider is unavailable."""

    def __init__(self, reason: str = "Gemini unavailable or misconfigured; using deterministic offline fallback."):
        self._reason = reason

    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        safe_prompt = (prompt or "").strip()
        summary = safe_prompt[:220].replace("\n", " ") or "workspace request"
        return (
            "Provider: deterministic_fallback\n"
            f"Status: {self._reason}\n\n"
            f"Prompt summary: {summary}\n\n"
            "This environment is running in offline-safe mode until a valid Gemini API key and model are configured."
        )

    def provider_name(self) -> str:
        return "deterministic_fallback"

    def model_name(self) -> str:
        return "offline_template"


def _create_provider() -> LLMProvider:
    """Factory: create the configured LLM provider."""
    configured_provider = (LLM_PROVIDER or "gemini").lower()

    if configured_provider == "deterministic":
        return DeterministicProvider()

    if configured_provider == "ollama":
        import os
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3")
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        try:
            return OllamaProvider(model=ollama_model, base_url=ollama_url)
        except Exception as exc:
            logger.warning("Falling back to deterministic provider after Ollama initialization error: %s", exc)
            return DeterministicProvider(str(exc))

    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is missing; using deterministic fallback provider.")
        return DeterministicProvider("GEMINI_API_KEY is missing or empty.")

    try:
        return GeminiProvider(api_key=GEMINI_API_KEY, model=GEMINI_MODEL)
    except Exception as exc:
        logger.warning("Gemini initialization failed; using deterministic fallback provider: %s", exc)
        return DeterministicProvider(str(exc))


# Singleton provider instance
_provider: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """Get the singleton LLM provider instance."""
    global _provider
    if _provider is None:
        _provider = _create_provider()
    return _provider


def ask_llm(
    prompt: str,
    system_instruction: Optional[str] = None,
    timeout: Optional[float] = None,
) -> str:
    """
    Backward-compatible wrapper.
    Send a prompt to the configured LLM and return the generated text.
    If timeout is specified (in seconds), raises TimeoutError if generation exceeds timeout.
    """
    if timeout is not None and timeout > 0:
        import concurrent.futures
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            future = executor.submit(get_llm_provider().generate, prompt, system_instruction)
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError as exc:
            raise TimeoutError(f"LLM generation timed out after {timeout} seconds") from exc
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
    return get_llm_provider().generate(prompt, system_instruction)
