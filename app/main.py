import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


app = FastAPI(title="Lyriks Emotion Mascot Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
    allow_origins=["*"],
)


TASKS: Dict[str, Dict[str, Any]] = {}
EVENTS: Dict[str, List[Dict[str, Any]]] = {}
MEMORY: List[Dict[str, Any]] = []


class HandoverRequest(BaseModel):
    clientRequestId: Optional[str] = None
    handoverAccepted: bool = True
    input: Dict[str, Any] = Field(default_factory=dict)
    sessionContext: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    messageType: str = "mascot_state_change"
    sessionContext: Dict[str, Any] = Field(default_factory=dict)
    statePatch: Dict[str, Any] = Field(default_factory=dict)
    taskID: str


class SearchRequest(BaseModel):
    allowedDomains: List[str] = Field(default_factory=list)
    maxResults: int = 5
    needBrowserAutomation: bool = False
    query: str
    subTaskId: Optional[str] = None
    taskID: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000):x}_{uuid.uuid4().hex[:8]}"


def get_nested(data: Dict[str, Any], *path: str, default: Any = None) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return default if current is None else current


def get_state(session_context: Dict[str, Any], state_patch: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    state_patch = state_patch or {}
    emotion = get_nested(session_context, "emotion", default={})
    action = get_nested(session_context, "action", default={})

    return {
        "actionId": state_patch.get("actionId") or action.get("id") or "commuting",
        "actionLabel": action.get("shortLabel") or action.get("label") or "正在通勤",
        "emotionId": state_patch.get("emotionId") or emotion.get("id") or "calm",
        "emotionLabel": emotion.get("label") or "平静",
        "interactionMode": state_patch.get("interactionMode")
        or session_context.get("interactionMode")
        or "normal",
        "skinSuiteId": state_patch.get("skinSuiteId"),
    }


def add_event(task_id: str, event: str, data: Dict[str, Any]) -> None:
    EVENTS.setdefault(task_id, []).append({
        "data": data,
        "event": event,
        "timestamp": now_iso(),
    })


def make_subtask(index: int, title: str, agent: str, toolkit: str, priority: int, depends_on: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "agent": agent,
        "dependsOn": depends_on or [],
        "priority": priority,
        "status": "planned",
        "subTaskId": f"subtask_{index:03d}",
        "title": title,
        "toolkit": toolkit,
    }


def create_plan(task_id: str, session_context: Dict[str, Any], user_text: str = "") -> Dict[str, Any]:
    state = get_state(session_context)
    state_label = f"{state['emotionLabel']} · {state['actionLabel']}"
    search_task = make_subtask(
        1,
        f"搜索适合「{state_label}」的听歌线索",
        "browser_agent",
        "webSearch",
        1,
    )

    return {
        "confirmedState": {
            "actionId": state["actionId"],
            "emotionId": state["emotionId"],
        },
        "createdAt": now_iso(),
        "humanInteraction": "handover_accepted",
        "planId": f"plan_{task_id}",
        "summary": f"已根据「{user_text}」整理接管任务。" if user_text else f"已为「{state_label}」整理接管任务。",
        "taskID": task_id,
        "tasks": [
            search_task,
            make_subtask(
                2,
                f"生成「{state_label}」三阶段歌单旅程",
                "music_recommendation_agent",
                "playlist",
                2,
                [search_task["subTaskId"]],
            ),
            make_subtask(
                3,
                "生成当前歌曲陪听特效",
                "multimodal_listening_effect_agent",
                "multimodalEffect",
                2,
            ),
            make_subtask(
                4,
                "规划温和续航与状态转场策略",
                "emotion_stamina_agent",
                "stamina",
                3,
            ),
        ],
    }


def build_initial_result(session_context: Dict[str, Any], user_text: str = "") -> Dict[str, Any]:
    state = get_state(session_context)
    return {
        "actionId": state["actionId"],
        "emotionId": state["emotionId"],
        "message": "团子已接管，会在同一个任务里继续陪你听。",
        "reason": user_text or "用户确认接管后启动 Agent workforce。",
        "sourceAgent": "emotion_mascot_coordinator",
    }


def run_subtasks(task: Dict[str, Any]) -> None:
    for subtask in task["plan"]["tasks"]:
        subtask["status"] = "completed"
        add_event(task["taskID"], "task.completed", {
            "agent": subtask["agent"],
            "result": {"summary": f"{subtask['title']} 已完成"},
            "subTaskId": subtask["subTaskId"],
            "taskID": task["taskID"],
        })
    add_event(task["taskID"], "result.ready", {
        "resultType": "mascot_workforce",
        "taskID": task["taskID"],
    })


@app.get("/health")
def health() -> Dict[str, str]:
    return {"service": "lyriks-emotion-mascot", "status": "ok"}


@app.post("/api/mascot/handover")
def handover(payload: HandoverRequest) -> Dict[str, Any]:
    if not payload.handoverAccepted:
        return {"status": "dismissed", "taskID": None}

    task_id = create_id("task")
    user_text = str(payload.input.get("userText") or "")
    plan = create_plan(task_id, payload.sessionContext, user_text)
    initial_result = build_initial_result(payload.sessionContext, user_text)
    task = {
        "createdAt": now_iso(),
        "initialResult": initial_result,
        "plan": plan,
        "sessionContext": payload.sessionContext,
        "status": "running",
        "taskID": task_id,
        "updatedAt": now_iso(),
    }
    TASKS[task_id] = task
    add_event(task_id, "task.created", {"planId": plan["planId"], "taskID": task_id})
    add_event(task_id, "task.started", {"agent": "task_agent", "taskID": task_id})
    run_subtasks(task)

    MEMORY.append({
        "createdAt": now_iso(),
        "payload": {
            "actionId": initial_result["actionId"],
            "emotionId": initial_result["emotionId"],
            "taskID": task_id,
        },
        "type": "handover.accepted",
    })

    return {
        "initialResult": initial_result,
        "plan": plan,
        "sseUrl": f"/api/mascot/events?taskID={task_id}",
        "status": task["status"],
        "taskID": task_id,
    }


@app.post("/api/mascot/chat")
def chat(payload: ChatRequest) -> Dict[str, Any]:
    task = TASKS.get(payload.taskID)
    if not task:
        raise HTTPException(status_code=404, detail=f"Unknown taskID: {payload.taskID}")

    state = get_state(task.get("sessionContext", {}), payload.statePatch)
    task["sessionContext"] = {
        **task.get("sessionContext", {}),
        **payload.sessionContext,
        "action": {
            **get_nested(task.get("sessionContext", {}), "action", default={}),
            "id": state["actionId"],
        },
        "emotion": {
            **get_nested(task.get("sessionContext", {}), "emotion", default={}),
            "id": state["emotionId"],
        },
        "interactionMode": state["interactionMode"],
    }
    task["status"] = "running"
    task["updatedAt"] = now_iso()

    reply = {
        "actionId": state["actionId"],
        "emotionId": state["emotionId"],
        "interactionMode": state["interactionMode"],
        "message": "已在同一个任务里继续调整团子状态。",
        "skinSuiteId": state.get("skinSuiteId"),
    }
    add_event(payload.taskID, "task.progress", {
        "messageType": payload.messageType,
        "reply": reply,
        "taskID": payload.taskID,
    })
    MEMORY.append({
        "createdAt": now_iso(),
        "payload": reply,
        "type": "task.chat",
    })

    return {
        "effects": {
            "durationMs": 2400,
            "intensity": "low" if state["interactionMode"] == "quiet" else "medium",
        },
        "reply": reply,
        "status": task["status"],
        "taskID": payload.taskID,
    }


@app.get("/api/mascot/tasks/{taskID}")
def get_task(taskID: str) -> Dict[str, Any]:
    task = TASKS.get(taskID)
    if not task:
        raise HTTPException(status_code=404, detail=f"Unknown taskID: {taskID}")
    return {
        **task,
        "events": EVENTS.get(taskID, []),
    }


@app.post("/api/mascot/tasks/{taskID}/cancel")
def cancel_task(taskID: str) -> Dict[str, Any]:
    task = TASKS.get(taskID)
    if not task:
        return {"status": "stopped", "taskID": taskID}
    task["status"] = "stopped"
    task["updatedAt"] = now_iso()
    add_event(taskID, "task.stopped", {"taskID": taskID})
    return {"status": "stopped", "taskID": taskID}


@app.post("/api/mascot/subtasks/{subTaskId}/retry")
def retry_subtask(subTaskId: str) -> Dict[str, Any]:
    for task in TASKS.values():
        for subtask in task["plan"]["tasks"]:
            if subtask["subTaskId"] == subTaskId:
                subtask["status"] = "completed"
                add_event(task["taskID"], "task.completed", {
                    "result": {"summary": f"{subtask['title']} 已重试完成"},
                    "subTaskId": subTaskId,
                    "taskID": task["taskID"],
                })
                return {"status": "completed", "subTaskId": subTaskId, "taskID": task["taskID"]}
    raise HTTPException(status_code=404, detail=f"Unknown subTaskId: {subTaskId}")


@app.get("/api/mascot/events")
async def mascot_events(taskID: str = Query(...)) -> StreamingResponse:
    async def event_stream():
        sent = 0
        while True:
            events = EVENTS.get(taskID, [])
            while sent < len(events):
                item = events[sent]
                sent += 1
                yield f"event: {item['event']}\ndata: {json.dumps(item['data'], ensure_ascii=False)}\n\n"

            task = TASKS.get(taskID)
            if task and task.get("status") in {"stopped", "failed"}:
                yield f"event: task.closed\ndata: {json.dumps({'taskID': taskID}, ensure_ascii=False)}\n\n"
                break

            yield f"event: heartbeat\ndata: {json.dumps({'taskID': taskID, 'timestamp': now_iso()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/mascot/search")
def mascot_search(payload: SearchRequest) -> Dict[str, Any]:
    result_count = max(1, min(payload.maxResults, 8))
    sources = [
        {
            "summary": f"围绕「{payload.query}」生成的本地搜索摘要，用于 Browser Agent 信息采集兜底。",
            "title": f"情绪团子搜索线索 {index + 1}",
            "url": f"local://emotion-mascot/search/{index + 1}",
        }
        for index in range(result_count)
    ]
    return {
        "agent": "browser_agent",
        "query": payload.query,
        "retrievedAt": now_iso(),
        "sources": sources,
        "subTaskId": payload.subTaskId,
        "summary": "本地后端 Browser Agent 已返回结构化搜索摘要；后续可替换为 Playwright 联网搜索。",
        "taskID": payload.taskID,
    }


@app.get("/api/mascot/memory/summary")
def memory_summary() -> Dict[str, Any]:
    accepted = [item for item in MEMORY if item.get("type") == "handover.accepted"]
    latest = accepted[-1]["payload"] if accepted else {}
    return {
        "favoriteActionId": latest.get("actionId"),
        "favoriteEmotionId": latest.get("emotionId"),
        "recentEvents": MEMORY[-8:],
        "totalEvents": len(MEMORY),
    }


@app.delete("/api/mascot/memory")
def clear_memory() -> Dict[str, str]:
    MEMORY.clear()
    return {"status": "cleared"}


@app.post("/chat")
def legacy_chat(payload: ChatRequest) -> Dict[str, Any]:
    return chat(payload)


@app.post("/emotion-mascot-agent/loop/start")
def legacy_loop_start(payload: Dict[str, Any]) -> Dict[str, Any]:
    session_context = payload.get("sessionContext") or {}
    state_patch = payload.get("statePatch") or {}
    if state_patch:
        session_context = {
            **session_context,
            "action": {"id": state_patch.get("actionId")},
            "emotion": {"id": state_patch.get("emotionId")},
        }
    return handover(HandoverRequest(
        handoverAccepted=True,
        input={"userText": get_nested(payload, "option", "description", default="")},
        sessionContext=session_context,
    ))


@app.post("/emotion-mascot-agent/loop/event")
def legacy_loop_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    task_id = payload.get("taskID")
    if not task_id:
        raise HTTPException(status_code=400, detail="taskID is required")
    return chat(ChatRequest(
        messageType=payload.get("messageType") or "mascot_state_change",
        sessionContext=payload.get("sessionContext") or {},
        statePatch=payload.get("statePatch") or {},
        taskID=task_id,
    ))


@app.post("/emotion-mascot-agent/loop/stop")
def legacy_loop_stop(payload: Dict[str, Any]) -> Dict[str, Any]:
    return cancel_task(payload.get("taskID") or "")
