from __future__ import annotations

import base64
import io
import json
import logging
import re
from datetime import date
from typing import Any

import pdfplumber
from openai import AsyncOpenAI

from app.config import settings
from app.schemas import ShiftExtraction

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _client_instance() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={
                "HTTP-Referer": settings.openrouter_site_url,
                "X-Title": settings.openrouter_app_name,
            },
        )
    return _client


EMAIL_PROMPT = """You are a shift extraction assistant for international students in Australia.

Extract ALL upcoming work shifts from the content below. This could be:
- A roster email from Deputy, Humanforce, or any employer
- A plain text message from a manager ("can you do Thursday 4-9?")
- A PDF roster

Return ONLY a valid JSON array. No explanation, no markdown, just raw JSON.

Format:
[{{"employer": "Cafe Name", "date": "YYYY-MM-DD", "start_time": "HH:MM",
  "end_time": "HH:MM", "hours": 5.0, "confidence": "high/medium/low"}}]

Rules:
- Only UPCOMING shifts (not past timesheets/payslips)
- If date is relative ("this Thursday"), calculate from today: {today}
- hours = (end - start) in decimal, subtract 0.5 for shifts over 5hrs (unpaid break)
- If NO shifts found, return []

Content:
{content}"""


CALENDAR_PROMPT = """You are analysing a Google Calendar event to determine if it is a work shift.

Event details:
- Title: {title}
- Description: {description}
- Start: {start}
- End: {end}

Is this a work shift? If yes, extract:
{{"is_work_shift": true, "employer": "name", "hours": 5.0}}

If not a work shift (personal appointment, class, gym etc):
{{"is_work_shift": false}}

Return only JSON."""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        logger.warning("PDF extraction failed: %s", exc)
        return ""


def _strip_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_first_json(text: str) -> str:
    """Some free models prepend chatter. Grab the first [...] or {...} block."""
    text = _strip_json(text)
    for opener, closer in (("[", "]"), ("{", "}")):
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end > start:
            return text[start : end + 1]
    return text


FALLBACK_MODELS = [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "z-ai/glm-4.5-air:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openai/gpt-oss-20b:free",
]


def _model_chain() -> list[str]:
    primary = settings.openrouter_model
    chain = [primary] + [m for m in FALLBACK_MODELS if m != primary]
    return chain


async def _chat_json(prompt: str, max_tokens: int = 2048) -> str:
    last_err: Exception | None = None
    for model in _model_chain():
        try:
            resp = await _client_instance().chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                temperature=0,
                messages=[
                    {
                        "role": "system",
                        "content": "You output only raw JSON. No prose, no markdown fences.",
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            content = resp.choices[0].message.content or ""
            if content.strip():
                logger.info("LLM call ok via %s", model)
                return content
            last_err = RuntimeError(f"empty content from {model}")
        except Exception as exc:
            logger.warning("Model %s failed: %s", model, exc)
            last_err = exc
    raise last_err or RuntimeError("all models failed")


async def extract_shifts_from_content(
    content: str, today: date | None = None
) -> list[ShiftExtraction]:
    if not content.strip():
        return []
    today = today or date.today()
    prompt = EMAIL_PROMPT.format(today=today.isoformat(), content=content)

    raw = await _chat_json(prompt)
    cleaned = _extract_first_json(raw)
    try:
        data: Any = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("LLM returned non-JSON: %s", raw[:500])
        return []
    if not isinstance(data, list):
        return []
    from app.services.shifts import clean_employer_name

    results: list[ShiftExtraction] = []
    for item in data:
        try:
            ext = ShiftExtraction(**item)
            ext.employer = clean_employer_name(ext.employer)
            results.append(ext)
        except Exception as exc:
            logger.warning("Bad shift item %s: %s", item, exc)
    return results


async def classify_calendar_event(
    title: str, description: str, start: str, end: str
) -> dict[str, Any]:
    prompt = CALENDAR_PROMPT.format(
        title=title, description=description or "", start=start, end=end
    )
    raw = await _chat_json(prompt, max_tokens=512)
    cleaned = _extract_first_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"is_work_shift": False}


def build_email_content(
    text_body: str | None,
    html_body: str | None,
    attachments: list[tuple[str, bytes, str]] | None = None,
) -> str:
    parts: list[str] = []
    if text_body:
        parts.append(text_body)
    elif html_body:
        parts.append(re.sub(r"<[^>]+>", " ", html_body))
    for name, data, content_type in attachments or []:
        if content_type == "application/pdf" or name.lower().endswith(".pdf"):
            pdf_text = extract_text_from_pdf(data)
            if pdf_text:
                parts.append(f"\n--- PDF: {name} ---\n{pdf_text}")
    return "\n\n".join(parts)


def decode_attachment(content_b64: str) -> bytes:
    return base64.b64decode(content_b64)
