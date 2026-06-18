from __future__ import annotations

import json
import logging
from typing import Any, Optional

import httpx

from app.component.environment import env

logger = logging.getLogger("lyriks.llm")


class LLMNotConfiguredError(RuntimeError):
    pass


class OpenAICompatibleLLM:
    def __init__(self) -> None:
        self.api_key = env("LYRIKS_LLM_API_KEY").strip()
        self.base_url = env("LYRIKS_LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.model = env("LYRIKS_LLM_MODEL", "gpt-4o-mini").strip()
        self.timeout = float(env("LYRIKS_LLM_TIMEOUT_SECONDS", "45"))

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.model and self.base_url)

    async def chat_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
    ) -> dict[str, Any]:
        raw = await self.chat_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            json_mode=True,
        )
        return self._parse_json(raw)

    async def chat_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        json_mode: bool = False,
    ) -> str:
        if not self.configured:
            raise LLMNotConfiguredError("LYRIKS_LLM_API_KEY / MODEL / BASE_URL 未配置")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        choice = ((data.get("choices") or [{}])[0].get("message") or {})
        content = choice.get("content")
        if isinstance(content, list):
            text_parts = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text_parts.append(item.get("text", ""))
            content = "".join(text_parts)
        return (content or "").strip()

    @staticmethod
    def _parse_json(raw: str) -> dict[str, Any]:
        candidate = raw.strip()
        if candidate.startswith("```"):
            candidate = candidate.strip("`")
            candidate = candidate.replace("json\n", "", 1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            start = candidate.find("{")
            end = candidate.rfind("}")
            if start >= 0 and end > start:
                return json.loads(candidate[start : end + 1])
            logger.warning("LLM JSON parse failed raw=%s", raw[:500])
            raise


_llm_client: Optional[OpenAICompatibleLLM] = None


def get_llm_client() -> OpenAICompatibleLLM:
    global _llm_client
    if _llm_client is None:
        _llm_client = OpenAICompatibleLLM()
    return _llm_client
