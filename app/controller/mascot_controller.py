from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.model.mascot import ChatRequest, HandoverRequest, SearchRequest, TaskView
from app.service.mascot_service import mascot_service

router = APIRouter()


@router.post("/api/mascot/handover")
async def handover(payload: HandoverRequest) -> dict[str, Any]:
    return await mascot_service.handover(payload)


@router.post("/api/mascot/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    return await mascot_service.chat(payload)


@router.get("/api/mascot/tasks/{taskID}", response_model=TaskView)
async def get_task(taskID: str) -> TaskView:
    task = await mascot_service.get_task_or_404(taskID)
    return TaskView(**task)


@router.post("/api/mascot/tasks/{taskID}/cancel")
async def cancel_task(taskID: str) -> dict[str, Any]:
    return await mascot_service.cancel_task(taskID)


@router.post("/api/mascot/subtasks/{subTaskId}/retry")
async def retry_subtask(subTaskId: str) -> dict[str, Any]:
    return await mascot_service.retry_subtask(subTaskId)


@router.get("/api/mascot/events")
async def mascot_events(taskID: str = Query(...)) -> StreamingResponse:
    return await mascot_service.stream_events(taskID)


@router.post("/api/mascot/search")
async def mascot_search(payload: SearchRequest) -> dict[str, Any]:
    return await mascot_service.mascot_search(payload)


@router.get("/api/mascot/memory/summary")
async def memory_summary() -> dict[str, Any]:
    return await mascot_service.memory_summary()


@router.delete("/api/mascot/memory")
async def clear_memory() -> dict[str, str]:
    return await mascot_service.clear_memory()


@router.post("/chat")
async def legacy_chat(payload: ChatRequest) -> dict[str, Any]:
    return await mascot_service.chat(payload)


@router.post("/emotion-mascot-agent/loop/start")
async def legacy_loop_start(payload: dict[str, Any]) -> dict[str, Any]:
    session_context = payload.get("sessionContext") or {}
    state_patch = payload.get("statePatch") or {}
    if state_patch.get("actionId"):
        session_context = {
            **session_context,
            "action": {
                **(session_context.get("action") or {}),
                "id": state_patch["actionId"],
            },
        }
    if state_patch.get("emotionId"):
        session_context = {
            **session_context,
            "emotion": {
                **(session_context.get("emotion") or {}),
                "id": state_patch["emotionId"],
            },
        }
    return await mascot_service.handover(
        HandoverRequest(
            handoverAccepted=True,
            input={"userText": ((payload.get("option") or {}).get("description") or "")},
            sessionContext=session_context,
        )
    )


@router.post("/emotion-mascot-agent/loop/event")
async def legacy_loop_event(payload: dict[str, Any]) -> dict[str, Any]:
    task_id = payload.get("taskID")
    if not task_id:
        raise HTTPException(status_code=400, detail="taskID is required")
    return await mascot_service.chat(
        ChatRequest(
            messageType=payload.get("messageType") or "mascot_state_change",
            sessionContext=payload.get("sessionContext") or {},
            statePatch=payload.get("statePatch") or {},
            taskID=task_id,
        )
    )


@router.post("/emotion-mascot-agent/loop/stop")
async def legacy_loop_stop(payload: dict[str, Any]) -> dict[str, Any]:
    return await mascot_service.cancel_task(payload.get("taskID") or "")
