"""
agents/shared/gemini_client.py — Gemini API client with:
  - Robust JSON parsing (handles markdown fences, thinking tags, extra prose)
  - Retry logic for transient errors
  - Explicit quota / API-key error detection with clear logs
  - Fallback "flag" response so agents never crash
"""
import os
import re
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as _FutureTimeout
import google.generativeai as genai
from shared.config import GEMINI_API_KEYS, MODEL_NAME, FALLBACK_MODEL_NAME

logger = logging.getLogger("clearclaim.gemini")

# Hard wall-clock budget per Gemini API attempt. The gRPC transport retries
# 503 UNAVAILABLE internally for up to 600s, which made a single
# generate_content() hang far past the 300s x402 maxTimeoutSeconds window
# (OKX review round 5: 4/4 recommend_policy replays timed out). REST transport
# + an outer thread deadline makes the bound unconditional.
GEMINI_TIMEOUT_S = int(os.getenv("GEMINI_TIMEOUT_S", "25"))

# Daemon pool: a deadline-abandoned call leaves its thread behind; keep enough
# workers that a few stragglers can't starve fresh requests.
_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="gemini")


def call_with_deadline(fn, timeout_s: float = GEMINI_TIMEOUT_S):
    """Runs fn() in a worker thread and gives up after timeout_s seconds,
    no matter what the SDK's own retry/deadline machinery does."""
    future = _executor.submit(fn)
    try:
        return future.result(timeout=timeout_s)
    except _FutureTimeout:
        future.cancel()
        # NB: wording must not contain "exceeded" — _is_quota_error keys on it
        raise TimeoutError(f"Gemini call timed out after {timeout_s}s deadline")


_current_key_idx = 0
_active_model_name = MODEL_NAME
model = None

def _init_model():
    global model
    if GEMINI_API_KEYS and _current_key_idx < len(GEMINI_API_KEYS):
        # REST transport: gRPC channels have been observed to ignore
        # request_options timeouts and hang; REST honours them.
        genai.configure(api_key=GEMINI_API_KEYS[_current_key_idx], transport="rest")
        model = genai.GenerativeModel(_active_model_name)
    else:
        logger.warning("[GeminiClient] No GEMINI_API_KEYS available — all AI calls will fallback.")
        model = None

_init_model()


def _is_model_error(err: Exception) -> bool:
    """Model can't serve right now → try the fallback model instead of
    retrying the same one. Includes 503 UNAVAILABLE / 'high demand': as of
    Jul 2026 gemini-3.5-flash 503s consistently while gemini-2.5-flash works."""
    msg = str(err).lower()
    return any(k in msg for k in [
        "not found", "404", "is not supported",
        "503", "unavailable", "high demand", "overloaded", "deadline",
    ])


def _downgrade_model() -> bool:
    """Primary model unavailable on this key → drop to the fallback model once."""
    global _active_model_name
    if _active_model_name != FALLBACK_MODEL_NAME:
        logger.warning(f"[GeminiClient] Model '{_active_model_name}' unavailable — "
                       f"falling back to '{FALLBACK_MODEL_NAME}'")
        _active_model_name = FALLBACK_MODEL_NAME
        _init_model()
        return True
    return False

def _rotate_api_key() -> bool:
    global _current_key_idx
    if _current_key_idx + 1 < len(GEMINI_API_KEYS):
        _current_key_idx += 1
        logger.info(f"[GeminiClient] Quota exhausted. Rotating to API Key #{_current_key_idx + 1}")
        _init_model()
        return True
    return False


def _extract_json(text: str) -> str:
    """Strips markdown fences, <thinking> tags, and prose wrapping around JSON."""
    # Strip <thinking>...</thinking>
    text = re.sub(r"<thinking>.*?</thinking>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Strip ```json ... ``` or ``` ... ```
    text = re.sub(r"^\s*```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```\s*$", "", text.strip())
    # Find the first { ... } block if there's prose around it
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return match.group(0)
    return text.strip()


def _fallback(reason: str) -> dict:
    """Uniform fallback response so agents never crash."""
    return {
        "decision": "Flag",
        "reasoning": reason,
        "confidence_score": 0.0,
        "fraud_indicators": ["AI Unavailable"],
    }


def _is_quota_error(err: Exception) -> bool:
    msg = str(err).lower()
    return any(k in msg for k in [
        "quota", "resource_exhausted", "429", "rate limit",
        "exceeded", "billing"
    ])


def _is_auth_error(err: Exception) -> bool:
    msg = str(err).lower()
    return any(k in msg for k in [
        "api key", "unauthorized", "authentication", "401", "403",
        "invalid_argument", "api_key_invalid"
    ])


def generate_json_response(prompt: str, max_retries: int = 2) -> dict:
    """
    Sends a prompt to Gemini and parses the JSON response.
    Returns a safe fallback on any failure — never raises.
    """
    if model is None:
        return _fallback("Gemini API key not configured.")

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = call_with_deadline(
                lambda: model.generate_content(
                    prompt, request_options={"timeout": GEMINI_TIMEOUT_S}
                )
            )
            text = (response.text or "").strip()
            if not text:
                last_error = "Empty response from Gemini"
                continue
            json_text = _extract_json(text)
            return json.loads(json_text)

        except json.JSONDecodeError as e:
            last_error = f"JSON parse error: {e}"
            logger.warning(f"[GeminiClient] Attempt {attempt + 1}: {last_error}. Raw: {text[:200]}")
            # No retry on parse error — response was received, model just failed format

        except Exception as e:
            last_error = str(e)
            if _is_auth_error(e):
                logger.error(f"[GeminiClient] Auth/API-key error: {e}")
                return _fallback("Gemini API key is invalid or unauthorized.")
            if _is_model_error(e) and _downgrade_model():
                continue
            if _is_quota_error(e):
                logger.error(f"[GeminiClient] Quota exhausted: {e}")
                if _rotate_api_key():
                    continue
                return _fallback("Gemini free tier quota exhausted. Try again tomorrow or upgrade billing.")
            logger.warning(f"[GeminiClient] Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
                continue

    return _fallback(f"AI evaluation failed after retries: {last_error}")


def generate_response(prompt: str, max_retries: int = 2) -> str:
    """
    Sends a prompt to Gemini and returns plain text (no JSON parsing).
    Used by chat agent, RLHF pipeline, and Hospital Assistant free-form responses.
    """
    if model is None:
        return "AI is currently unavailable (API key missing)."
        
    last_error = ""
    for attempt in range(max_retries + 1):
        try:
            response = call_with_deadline(
                lambda: model.generate_content(
                    prompt, request_options={"timeout": GEMINI_TIMEOUT_S}
                )
            )
            return (response.text or "").strip() or "AI returned an empty response."
        except Exception as e:
            last_error = str(e)
            if _is_auth_error(e):
                return "Sorry, the AI service key is invalid. Please contact support."
            if _is_model_error(e) and _downgrade_model():
                continue
            if _is_quota_error(e):
                if _rotate_api_key():
                    continue
                return "The AI service has reached its daily quota. Please try again tomorrow."
            logger.error(f"[GeminiClient] Plain-text error attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                time.sleep(1.5 * (attempt + 1))
                continue
                
    return f"AI temporarily unavailable: {last_error[:120]}"
