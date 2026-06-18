from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from copy import deepcopy
from typing import Any, Optional

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.agent import skills
from app.agent.workforce import EmotionMascotWorkforce
from app.model.mascot import ChatRequest, HandoverRequest, SearchRequest
from app.service.task import (
    create_task_lock,
    delete_task_lock,
    get_or_create_task_lock,
    get_task_lock_if_exists,
)
from app.utils.telemetry.workforce_metrics import create_telemetry_session

logger = logging.getLogger("lyriks.mascot_service")


class MascotService:
    def __init__(self) -> None:
        self.tasks: dict[str, dict[str, Any]] = {}
        self.events: dict[str, list[dict[str, Any]]] = {}
        self.memory: list[dict[str, Any]] = []
        self.runners: dict[str, asyncio.Task[Any]] = {}
        self.telemetry_sessions: dict[str, Any] = {}
        self.cancelled_tasks: set[str] = set()
        self._lock = asyncio.Lock()
        self._workforce = EmotionMascotWorkforce(self)

    async def startup(self) -> None:
        logger.info("Mascot service ready")

    async def shutdown(self) -> None:
        runner_ids = list(self.runners.keys())
        for task_id in runner_ids:
            await self._workforce.cancel_runner(task_id)
        for task_id, task in list(self.tasks.items()):
            telemetry = self.telemetry_sessions.get(task_id)
            if telemetry is not None:
                telemetry.finish(status=task.get("status") or "stopped")
            await delete_task_lock(task_id)
        self.runners.clear()
        self.telemetry_sessions.clear()
        logger.info("Mascot service shutdown complete")

    async def handover(self, payload: HandoverRequest) -> dict[str, Any]:
        if not payload.handoverAccepted:
            logger.info(
                "Handover dismissed clientRequestId=%s", payload.clientRequestId
            )
            return {"status": "dismissed", "taskID": None}

        task_id = self._create_id("task")
        user_text = str(payload.input.get("userText") or "")
        handover_plan = skills.today_handover(payload.sessionContext)
        initial_result = skills.build_initial_result(
            payload.sessionContext, user_text, handover_plan
        )
        task_lock = create_task_lock(task_id)
        telemetry = create_telemetry_session(project_id="emotion-mascot", task_id=task_id)
        self.telemetry_sessions[task_id] = telemetry

        session_context = deepcopy(payload.sessionContext)
        session_context["taskID"] = task_id
        if handover_plan.get("actionId"):
            session_context["action"] = {
                **(session_context.get("action") or {}),
                "id": handover_plan["actionId"],
            }
        if handover_plan.get("emotionId"):
            session_context["emotion"] = {
                **(session_context.get("emotion") or {}),
                "id": handover_plan["emotionId"],
            }

        plan = skills.create_plan(task_id, session_context, handover_plan, user_text)
        task = {
            "createdAt": skills.now_iso(),
            "events": [],
            "initialResult": initial_result,
            "latestReply": initial_result,
            "latestResult": None,
            "plan": plan,
            "sessionContext": session_context,
            "sessionMinutes": 0,
            "status": "running",
            "taskID": task_id,
            "telemetry": json.loads(telemetry.dump_to_json()),
            "updatedAt": skills.now_iso(),
        }

        async with self._lock:
            self.tasks[task_id] = task
            self.cancelled_tasks.discard(task_id)

        await self.add_event(
            task_id, "task.created", {"planId": plan["planId"], "taskID": task_id}
        )
        telemetry.log_task_created({"planId": plan["planId"], "taskID": task_id})
        await self.append_memory(
            {
                "createdAt": skills.now_iso(),
                "payload": {
                    "actionId": initial_result["actionId"],
                    "emotionId": initial_result["emotionId"],
                    "taskID": task_id,
                },
                "type": "handover.accepted",
            }
        )

        runner = asyncio.create_task(self._workforce.run_task(task_id))
        self.runners[task_id] = runner
        task_lock.add_background_task(runner)
        return {
            "initialResult": initial_result,
            "plan": plan,
            "sseUrl": f"/api/mascot/events?taskID={task_id}",
            "status": task["status"],
            "taskID": task_id,
        }

    async def chat(self, payload: ChatRequest) -> dict[str, Any]:
        task = await self.get_task(payload.taskID)
        if task is None:
            logger.info(
                "Chat received for unknown taskID=%s, creating placeholder task",
                payload.taskID,
            )
            task_lock = get_or_create_task_lock(payload.taskID)
            telemetry = create_telemetry_session(
                project_id="emotion-mascot", task_id=payload.taskID
            )
            self.telemetry_sessions[payload.taskID] = telemetry
            session_context = deepcopy(payload.sessionContext)
            session_context["taskID"] = payload.taskID
            initial_handover = skills.today_handover(session_context)
            initial_result = skills.build_initial_result(
                session_context, "", initial_handover
            )
            plan = skills.create_plan(
                payload.taskID, session_context, initial_handover, ""
            )
            async with self._lock:
                self.tasks[payload.taskID] = {
                    "createdAt": skills.now_iso(),
                    "events": [],
                    "initialResult": initial_result,
                    "latestReply": initial_result,
                    "latestResult": None,
                    "plan": plan,
                    "sessionContext": session_context,
                    "sessionMinutes": 0,
                    "status": "running",
                    "taskID": payload.taskID,
                    "telemetry": json.loads(telemetry.dump_to_json()),
                    "updatedAt": skills.now_iso(),
                }
            await self.add_event(
                payload.taskID,
                "task.created",
                {"planId": plan["planId"], "taskID": payload.taskID},
            )
            telemetry.log_task_created(
                {"planId": plan["planId"], "taskID": payload.taskID}
            )
            task_lock.touch()

        return await self._workforce.handle_chat(
            task_id=payload.taskID,
            message_type=payload.messageType,
            session_context=payload.sessionContext,
            state_patch=payload.statePatch,
        )

    async def get_task_or_404(self, task_id: str) -> dict[str, Any]:
        task = await self.get_task(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail=f"Unknown taskID: {task_id}")
        return task

    async def get_task(self, task_id: str) -> Optional[dict[str, Any]]:
        async with self._lock:
            task = self.tasks.get(task_id)
            if task is None:
                return None
            telemetry = self.telemetry_sessions.get(task_id)
            if telemetry is not None:
                task["telemetry"] = json.loads(telemetry.dump_to_json())
            return deepcopy(task)

    async def cancel_task(self, task_id: str) -> dict[str, Any]:
        task = await self.get_task(task_id)
        if task is None:
            logger.info("Cancel ignored (unknown task) taskID=%s", task_id)
            return {"status": "stopped", "taskID": task_id}

        self.cancelled_tasks.add(task_id)
        await self.update_task_status(task_id, "stopped")
        await self.add_event(task_id, "task.stopped", {"taskID": task_id})
        await self._workforce.cancel_runner(task_id)
        task_lock = get_task_lock_if_exists(task_id)
        if task_lock is not None:
            task_lock.cancel_event.set()
        async with self._lock:
            task = self.tasks.get(task_id)
            telemetry = self.telemetry_sessions.get(task_id)
            if task is not None and telemetry is not None:
                telemetry.finish(status="stopped")
                task["telemetry"] = json.loads(telemetry.dump_to_json())
        return {"status": "stopped", "taskID": task_id}

    async def retry_subtask(self, subtask_id: str) -> dict[str, Any]:
        task_id = None
        async with self._lock:
            for candidate_task_id, task in self.tasks.items():
                if any(
                    item["subTaskId"] == subtask_id for item in task["plan"]["tasks"]
                ):
                    task_id = candidate_task_id
                    break

        if task_id is None:
            raise HTTPException(
                status_code=404, detail=f"Unknown subTaskId: {subtask_id}"
            )

        result = await self._workforce.retry_subtask(task_id, subtask_id)
        if result is None:
            raise HTTPException(
                status_code=404, detail=f"Unknown subTaskId: {subtask_id}"
            )
        return {"status": "completed", "subTaskId": subtask_id, "taskID": task_id}

    async def mascot_search(self, payload: SearchRequest) -> dict[str, Any]:
        task = await self.get_task(payload.taskID or "") if payload.taskID else None
        session_context = (task or {}).get("sessionContext") or {}
        fallback = skills.search_summary(
            query=payload.query,
            session_context=session_context,
            task_id=payload.taskID,
            subtask_id=payload.subTaskId,
        )
        result = await self._workforce._search_toolkit.search_web(
            query=payload.query,
            max_results=payload.maxResults,
            allowed_domains=payload.allowedDomains,
        )
        fallback["provider"] = result.get("provider", "unknown")
        fallback["sources"] = result.get("sources") or fallback["sources"]
        return fallback

    async def memory_summary(self) -> dict[str, Any]:
        accepted = [
            item for item in self.memory if item.get("type") == "handover.accepted"
        ]
        latest = accepted[-1]["payload"] if accepted else {}
        return {
            "favoriteActionId": latest.get("actionId"),
            "favoriteEmotionId": latest.get("emotionId"),
            "recentEvents": self.memory[-8:],
            "totalEvents": len(self.memory),
        }

    async def clear_memory(self) -> dict[str, str]:
        self.memory.clear()
        return {"status": "cleared"}

    async def stream_events(self, task_id: str) -> StreamingResponse:
        async def event_stream():
            logger.info("SSE subscribe taskID=%s", task_id)
            sent = 0
            while True:
                async with self._lock:
                    items = deepcopy(self.events.get(task_id, []))
                    task = deepcopy(self.tasks.get(task_id))

                while sent < len(items):
                    item = items[sent]
                    sent += 1
                    yield (
                        f"event: {item['event']}\n"
                        f"data: {json.dumps(item['data'], ensure_ascii=False)}\n\n"
                    )

                if task and task.get("status") in {"stopped", "failed", "done"}:
                    yield (
                        "event: task.closed\n"
                        f"data: {json.dumps({'taskID': task_id, 'status': task.get('status')}, ensure_ascii=False)}\n\n"
                    )
                    logger.info(
                        "SSE closed taskID=%s status=%s",
                        task_id,
                        task.get("status"),
                    )
                    break

                yield (
                    "event: heartbeat\n"
                    f"data: {json.dumps({'taskID': task_id, 'timestamp': skills.now_iso()}, ensure_ascii=False)}\n\n"
                )
                await asyncio.sleep(3)

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    async def add_event(self, task_id: str, event: str, data: dict[str, Any]) -> None:
        payload = {
            "data": deepcopy(data),
            "event": event,
            "timestamp": skills.now_iso(),
        }
        async with self._lock:
            self.events.setdefault(task_id, []).append(payload)
            task = self.tasks.get(task_id)
            if task is not None:
                task.setdefault("events", []).append(payload)
                telemetry = self.telemetry_sessions.get(task_id)
                if telemetry is not None:
                    task["telemetry"] = json.loads(telemetry.dump_to_json())
                task["updatedAt"] = skills.now_iso()
        logger.info(
            "SSE event queued event=%s taskID=%s subTaskId=%s",
            event,
            task_id,
            data.get("subTaskId"),
        )

    async def append_memory(self, item: dict[str, Any]) -> None:
        self.memory.append(deepcopy(item))
        self.memory[:] = self.memory[-40:]

    async def update_task_status(self, task_id: str, status: str) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if task is None:
                return
            task["status"] = status
            telemetry = self.telemetry_sessions.get(task_id)
            if telemetry is not None:
                task["telemetry"] = json.loads(telemetry.dump_to_json())
            task["updatedAt"] = skills.now_iso()

    async def update_session_context(
        self, task_id: str, session_context: dict[str, Any]
    ) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if task is None:
                return
            task["sessionContext"] = deepcopy(session_context)
            task["updatedAt"] = skills.now_iso()

    async def set_latest_reply(self, task_id: str, reply: dict[str, Any]) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if task is None:
                return
            task["latestReply"] = deepcopy(reply)
            task["updatedAt"] = skills.now_iso()

    async def set_latest_result(self, task_id: str, result: dict[str, Any]) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if task is None:
                return
            task["latestResult"] = deepcopy(result)
            telemetry = self.telemetry_sessions.get(task_id)
            if telemetry is not None:
                task["telemetry"] = json.loads(telemetry.dump_to_json())
            task["updatedAt"] = skills.now_iso()

    async def mark_subtask_running(self, task_id: str, subtask_id: str) -> None:
        async with self._lock:
            subtask = self._find_subtask(task_id, subtask_id)
            if subtask is None:
                return
            subtask["status"] = "running"
            subtask["error"] = None

    async def mark_subtask_completed(
        self, task_id: str, subtask_id: str, result: dict[str, Any]
    ) -> None:
        async with self._lock:
            subtask = self._find_subtask(task_id, subtask_id)
            if subtask is None:
                return
            subtask["status"] = "completed"
            subtask["result"] = deepcopy(result)
            subtask["error"] = None
            task = self.tasks.get(task_id)
            if task is not None:
                task["updatedAt"] = skills.now_iso()

    async def mark_subtask_failed(
        self, task_id: str, subtask_id: str, error: str
    ) -> None:
        async with self._lock:
            subtask = self._find_subtask(task_id, subtask_id)
            if subtask is None:
                return
            subtask["status"] = "failed"
            subtask["error"] = error
            task = self.tasks.get(task_id)
            if task is not None:
                task["updatedAt"] = skills.now_iso()

    def _find_subtask(
        self, task_id: str, subtask_id: str
    ) -> Optional[dict[str, Any]]:
        task = self.tasks.get(task_id)
        if task is None:
            return None
        for item in task["plan"]["tasks"]:
            if item["subTaskId"] == subtask_id:
                return item
        return None

    @staticmethod
    def _create_id(prefix: str) -> str:
        return f"{prefix}_{int(time.time() * 1000):x}_{uuid.uuid4().hex[:8]}"


mascot_service = MascotService()
