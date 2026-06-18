from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger("lyriks.telemetry")

try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
        OTLPSpanExporter,
    )
    from opentelemetry.sdk.resources import SERVICE_NAME, Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.trace import Status, StatusCode
except Exception:  # noqa: BLE001
    trace = None
    OTLPSpanExporter = None
    Resource = None
    TracerProvider = None
    BatchSpanProcessor = None
    Status = None
    StatusCode = None

_GLOBAL_TRACER_PROVIDER = None


def initialize_tracer_provider() -> None:
    global _GLOBAL_TRACER_PROVIDER
    if trace is None or TracerProvider is None or _GLOBAL_TRACER_PROVIDER is not None:
        return

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
    service_name = os.getenv("LYRIKS_OTEL_SERVICE_NAME", "lyriks-mascot-workforce")
    provider = TracerProvider(
        resource=Resource(attributes={SERVICE_NAME: service_name})
    )

    if endpoint:
        try:
            exporter = OTLPSpanExporter(endpoint=endpoint)
            processor = BatchSpanProcessor(exporter)
            provider.add_span_processor(processor)
            logger.info("OpenTelemetry exporter enabled endpoint=%s", endpoint)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to initialize OTLP exporter: %s", exc)

    _GLOBAL_TRACER_PROVIDER = provider


def shutdown_tracer_provider() -> None:
    global _GLOBAL_TRACER_PROVIDER
    if _GLOBAL_TRACER_PROVIDER is None:
        return
    try:
        _GLOBAL_TRACER_PROVIDER.shutdown()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to shutdown tracer provider: %s", exc)
    finally:
        _GLOBAL_TRACER_PROVIDER = None


def get_tracer_provider():
    return _GLOBAL_TRACER_PROVIDER


class MascotTelemetrySession:
    def __init__(self, project_id: str, task_id: str) -> None:
        self.project_id = project_id
        self.task_id = task_id
        self.enabled = bool(get_tracer_provider() and trace is not None)
        self._tracer = None
        self._root_span = None
        self._task_spans: dict[str, Any] = {}

        if self.enabled:
            self._tracer = get_tracer_provider().get_tracer("lyriks.mascot")
            self._root_span = self._tracer.start_span(f"mascot.task:{task_id}")
            self._root_span.set_attribute("lyriks.project.id", project_id)
            self._root_span.set_attribute("lyriks.task.id", task_id)

    def log_task_created(self, payload: dict[str, Any]) -> None:
        self._log_event("task.created", payload)

    def log_task_started(self, subtask_id: str, agent: str) -> None:
        if self.enabled and self._tracer and self._root_span:
            ctx = trace.set_span_in_context(self._root_span)
            span = self._tracer.start_span(f"subtask:{subtask_id}", context=ctx)
            span.set_attribute("lyriks.subtask.id", subtask_id)
            span.set_attribute("lyriks.worker.agent", agent)
            span.set_attribute("lyriks.task.id", self.task_id)
            self._task_spans[subtask_id] = span
        self._log_event("task.started", {"subTaskId": subtask_id, "agent": agent})

    def log_task_completed(self, subtask_id: str, payload: dict[str, Any]) -> None:
        span = self._task_spans.pop(subtask_id, None)
        if span is not None and Status is not None and StatusCode is not None:
            span.set_status(Status(StatusCode.OK))
            span.end()
        self._log_event("task.completed", payload)

    def log_task_failed(self, subtask_id: str, error: str) -> None:
        span = self._task_spans.pop(subtask_id, None)
        if span is not None and Status is not None and StatusCode is not None:
            span.set_status(Status(StatusCode.ERROR, error))
            span.end()
        self._log_event("task.failed", {"subTaskId": subtask_id, "error": error})

    def log_llm_call(
        self,
        name: str,
        latency_ms: float,
        model: str,
        prompt_preview: str,
    ) -> None:
        self._log_event(
            "llm.call",
            {
                "latencyMs": round(latency_ms, 2),
                "model": model,
                "name": name,
                "promptPreview": prompt_preview[:240],
            },
        )

    def log_search(
        self,
        query: str,
        provider: str,
        result_count: int,
        latency_ms: float,
    ) -> None:
        self._log_event(
            "browser.search",
            {
                "latencyMs": round(latency_ms, 2),
                "provider": provider,
                "query": query,
                "resultCount": result_count,
            },
        )

    def log_result_ready(self, payload: dict[str, Any]) -> None:
        self._log_event("result.ready", payload)

    def dump_to_json(self) -> str:
        return json.dumps(
            {
                "enabled": self.enabled,
                "project_id": self.project_id,
                "task_id": self.task_id,
                "active_spans": len(self._task_spans),
            }
        )

    def finish(self, status: str = "ok") -> None:
        for subtask_id in list(self._task_spans.keys()):
            span = self._task_spans.pop(subtask_id)
            if Status is not None and StatusCode is not None:
                span.set_status(Status(StatusCode.ERROR, "session finished early"))
            span.end()
        if self._root_span is not None and Status is not None and StatusCode is not None:
            code = StatusCode.OK if status == "ok" else StatusCode.ERROR
            self._root_span.set_status(Status(code))
            self._root_span.end()
            self._root_span = None

    def _log_event(self, event: str, payload: dict[str, Any]) -> None:
        logger.info(
            "telemetry event=%s taskID=%s payload=%s",
            event,
            self.task_id,
            json.dumps(payload, ensure_ascii=False)[:1000],
        )


def create_telemetry_session(project_id: str, task_id: str) -> MascotTelemetrySession:
    return MascotTelemetrySession(project_id=project_id, task_id=task_id)


def monotonic_ms() -> float:
    return time.perf_counter() * 1000
