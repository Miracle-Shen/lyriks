from __future__ import annotations

import logging
import re
from html import unescape
from typing import Any, Optional
from urllib.parse import urlparse

import httpx

from app.component.environment import env

logger = logging.getLogger("lyriks.search_toolkit")


class SearchToolkit:
    def __init__(self, timeout: float = 12.0) -> None:
        self.timeout = timeout

    async def search_web(
        self,
        query: str,
        max_results: int = 5,
        allowed_domains: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        allowed_domains = allowed_domains or []
        try:
            if env("SERPER_API_KEY"):
                results = await self._search_serper(query, max_results, allowed_domains)
                provider = "serper"
            else:
                results = await self._search_duckduckgo(query, max_results, allowed_domains)
                provider = "duckduckgo"
        except Exception as exc:  # noqa: BLE001
            logger.warning("Search provider failed query=%s error=%s", query, exc)
            return {
                "provider": "fallback",
                "query": query,
                "sources": [],
            }

        sources = []
        for item in results[:max_results]:
            excerpt = await self._fetch_page_excerpt(item.get("url", ""))
            sources.append(
                {
                    "title": item.get("title") or "Untitled",
                    "url": item.get("url"),
                    "summary": excerpt or item.get("summary") or "未能提取页面摘要。",
                }
            )

        return {
            "provider": provider,
            "query": query,
            "sources": sources,
        }

    async def _search_serper(
        self,
        query: str,
        max_results: int,
        allowed_domains: list[str],
    ) -> list[dict[str, Any]]:
        payload = {"q": query, "num": max_results}
        headers = {"X-API-KEY": env("SERPER_API_KEY"), "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                "https://google.serper.dev/search", headers=headers, json=payload
            )
            response.raise_for_status()
            data = response.json()

        organic = data.get("organic", []) or []
        return [
            {
                "title": item.get("title"),
                "url": item.get("link"),
                "summary": item.get("snippet"),
            }
            for item in organic
            if self._domain_allowed(item.get("link"), allowed_domains)
        ]

    async def _search_duckduckgo(
        self,
        query: str,
        max_results: int,
        allowed_domains: list[str],
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.get(
                "https://html.duckduckgo.com/html/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0"},
            )
            response.raise_for_status()
            html = response.text

        pattern = re.compile(
            r'<a[^>]*class="result__a"[^>]*href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>.*?'
            r'<a[^>]*class="result__snippet"[^>]*>(?P<snippet>.*?)</a>',
            re.S,
        )
        results = []
        for match in pattern.finditer(html):
            url = unescape(re.sub(r"\s+", " ", match.group("url"))).strip()
            if not self._domain_allowed(url, allowed_domains):
                continue
            results.append(
                {
                    "title": self._strip_tags(match.group("title")),
                    "url": url,
                    "summary": self._strip_tags(match.group("snippet")),
                }
            )
            if len(results) >= max_results:
                break
        return results

    async def _fetch_page_excerpt(self, url: str) -> str:
        if not url.startswith("http"):
            return ""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                response.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            logger.debug("Failed to fetch page excerpt url=%s error=%s", url, exc)
            return ""

        html = response.text
        title_match = re.search(r"<title>(.*?)</title>", html, re.S | re.I)
        title = self._strip_tags(title_match.group(1)) if title_match else ""
        paragraph_match = re.search(r"<p[^>]*>(.*?)</p>", html, re.S | re.I)
        paragraph = self._strip_tags(paragraph_match.group(1)) if paragraph_match else ""
        excerpt = " ".join(item for item in [title, paragraph] if item).strip()
        return excerpt[:320]

    @staticmethod
    def _domain_allowed(url: Optional[str], allowed_domains: list[str]) -> bool:
        if not url or not allowed_domains:
            return bool(url)
        hostname = urlparse(url).hostname or ""
        return any(
            hostname == domain or hostname.endswith(f".{domain}")
            for domain in allowed_domains
        )

    @staticmethod
    def _strip_tags(raw: str) -> str:
        return unescape(re.sub(r"<[^>]+>", " ", raw or "")).replace("\n", " ").strip()
