from __future__ import annotations

import asyncio
import contextlib
import hashlib
import logging
from copy import deepcopy
from typing import Any, Optional

from app.agent.llm import LLMNotConfiguredError, get_llm_client
from app.agent import skills
from app.agent.toolkit.search_toolkit import SearchToolkit
from app.service.task import get_task_lock_if_exists
from app.utils.telemetry.workforce_metrics import monotonic_ms

logger = logging.getLogger("lyriks.mascot_workforce")


class EmotionMascotWorkforce:
    def __init__(self, store) -> None:
        self._store = store
        self._search_toolkit = SearchToolkit()

    async def run_task(self, task_id: str) -> None:
        task = await self._store.get_task(task_id)
        if task is None:
            return
        task_lock = get_task_lock_if_exists(task_id)
        telemetry = self._store.telemetry_sessions.get(task_id)

        async with (task_lock.execution_lock if task_lock is not None else _null_lock()):
            await self._store.update_task_status(task_id, "running")
            subtasks = sorted(
                task["plan"]["tasks"],
                key=lambda item: (item["priority"], item["subTaskId"]),
            )
            completed: set[str] = set()
            aggregated: dict[str, Any] = {}

            for subtask in subtasks:
                if task_id in self._store.cancelled_tasks or (
                    task_lock is not None and task_lock.cancel_event.is_set()
                ):
                    logger.info(
                        "Task execution interrupted because it was cancelled taskID=%s",
                        task_id,
                    )
                    return

                unmet = [
                    dependency
                    for dependency in subtask.get("dependsOn", [])
                    if dependency not in completed
                ]
                if unmet:
                    message = f"Dependencies not satisfied: {', '.join(unmet)}"
                    await self._store.mark_subtask_failed(
                        task_id, subtask["subTaskId"], message
                    )
                    await self._store.update_task_status(task_id, "failed")
                    await self._store.add_event(
                        task_id,
                        "task.failed",
                        {
                            "subTaskId": subtask["subTaskId"],
                            "taskID": task_id,
                            "error": message,
                        },
                    )
                    if telemetry is not None:
                        telemetry.log_task_failed(subtask["subTaskId"], message)
                        telemetry.finish(status="failed")
                    return

                await self._store.mark_subtask_running(task_id, subtask["subTaskId"])
                await self._store.add_event(
                    task_id,
                    "task.started",
                    {
                        "agent": subtask["agent"],
                        "subTaskId": subtask["subTaskId"],
                        "taskID": task_id,
                    },
                )
                if telemetry is not None:
                    telemetry.log_task_started(subtask["subTaskId"], subtask["agent"])

                try:
                    result = await self._execute_subtask(task_id, subtask, aggregated)
                except Exception as exc:  # noqa: BLE001
                    logger.exception(
                        "Subtask failed taskID=%s subTaskId=%s",
                        task_id,
                        subtask["subTaskId"],
                    )
                    await self._store.mark_subtask_failed(
                        task_id, subtask["subTaskId"], str(exc)
                    )
                    await self._store.update_task_status(task_id, "failed")
                    await self._store.add_event(
                        task_id,
                        "task.failed",
                        {
                            "agent": subtask["agent"],
                            "error": str(exc),
                            "subTaskId": subtask["subTaskId"],
                            "taskID": task_id,
                        },
                    )
                    if telemetry is not None:
                        telemetry.log_task_failed(subtask["subTaskId"], str(exc))
                        telemetry.finish(status="failed")
                    return

                aggregated[subtask["toolkit"]] = result
                completed.add(subtask["subTaskId"])
                await self._store.mark_subtask_completed(
                    task_id, subtask["subTaskId"], result
                )
                await self._store.add_event(
                    task_id,
                    "task.completed",
                    {
                        "agent": subtask["agent"],
                        "result": result,
                        "subTaskId": subtask["subTaskId"],
                        "taskID": task_id,
                    },
                )
                if telemetry is not None:
                    telemetry.log_task_completed(
                        subtask["subTaskId"],
                        {
                            "agent": subtask["agent"],
                            "resultType": subtask["toolkit"],
                        },
                    )
                await asyncio.sleep(0.15)

            final_result = {
                "resultType": "mascot_workforce",
                "taskID": task_id,
                "outputs": aggregated,
            }
            await self._store.set_latest_result(task_id, final_result)
            await self._store.update_task_status(task_id, "done")
            await self._store.add_event(task_id, "result.ready", final_result)
            if telemetry is not None:
                telemetry.log_result_ready(final_result)
                telemetry.finish(status="ok")

    async def handle_chat(
        self,
        task_id: str,
        message_type: str,
        session_context: dict,
        state_patch: dict,
    ) -> dict:
        task = await self._store.get_task(task_id)
        task_lock = get_task_lock_if_exists(task_id)
        base_context = deepcopy((task or {}).get("sessionContext") or {})
        base_context.update(session_context or {})

        async with (task_lock.execution_lock if task_lock is not None else _null_lock()):
            merged_context = {
                **base_context,
                "interactionMode": state_patch.get("interactionMode")
                or base_context.get("interactionMode")
                or "normal",
                "taskID": task_id,
            }
            if state_patch.get("actionId"):
                merged_context["action"] = {
                    **(base_context.get("action") or {}),
                    "id": state_patch["actionId"],
                }
            if state_patch.get("emotionId"):
                merged_context["emotion"] = {
                    **(base_context.get("emotion") or {}),
                    "id": state_patch["emotionId"],
                }

            emotion_result = None
            if message_type != "mascot_state_change":
                emotion_result = await self._generate_emotion_state(
                    task_id=task_id,
                    user_text=message_type,
                    session_context=merged_context,
                )
            quiet_mode = merged_context.get("interactionMode") == "quiet" or not merged_context.get(
                "effectsEnabled", True
            )
            multimodal_result = skills.multimodal_effect(
                active_song=skills.get_nested(
                    merged_context, "playback", "song", default={}
                ),
                quiet_mode=quiet_mode,
                session_context=merged_context,
            )
            stamina_result = skills.stamina(
                session_minutes=int((task or {}).get("sessionMinutes") or 0),
                session_context=merged_context,
                task_id=task_id,
            )
            state = skills.resolve_state(
                merged_context,
                {
                    "actionId": state_patch.get("actionId")
                    or (emotion_result or {}).get("actionId"),
                    "emotionId": state_patch.get("emotionId")
                    or (emotion_result or {}).get("emotionId"),
                    "interactionMode": merged_context.get("interactionMode"),
                    "skinSuiteId": state_patch.get("skinSuiteId"),
                },
            )
            reply = await self._generate_chat_reply(
                task_id=task_id,
                message_type=message_type,
                state=state,
                session_context=merged_context,
                multimodal_result=multimodal_result,
                stamina_result=stamina_result,
            )
            result = {
                "effects": {
                    "durationMs": skills.get_nested(
                        multimodal_result, "effectPlan", default=[{}]
                    )[0].get("durationMs", 1800),
                    "intensity": skills.get_nested(
                        multimodal_result, "effectPlan", default=[{}]
                    )[0].get("intensity", "low"),
                },
                "reply": reply,
                "status": "running",
                "taskID": task_id,
            }
            await self._store.update_session_context(task_id, merged_context)
            await self._store.update_task_status(task_id, "running")
            await self._store.set_latest_reply(task_id, reply)
            await self._store.append_memory(
                {
                    "createdAt": skills.now_iso(),
                    "payload": reply,
                    "type": "task.chat",
                }
            )
            await self._store.add_event(
                task_id,
                "task.progress",
                {
                    "messageType": message_type,
                    "reply": reply,
                    "taskID": task_id,
                },
            )
            if stamina_result.get("shouldSuggest"):
                await self._store.append_memory(
                    {
                        "createdAt": skills.now_iso(),
                        "payload": stamina_result,
                        "type": "stamina.suggested",
                    }
                )
            return result

    async def retry_subtask(
        self, task_id: str, subtask_id: str
    ) -> Optional[dict[str, Any]]:
        task = await self._store.get_task(task_id)
        if task is None:
            return None

        aggregated = ((task.get("latestResult") or {}).get("outputs") or {}).copy()
        for subtask in task["plan"]["tasks"]:
            if subtask["subTaskId"] != subtask_id:
                continue
            await self._store.mark_subtask_running(task_id, subtask_id)
            await self._store.add_event(
                task_id,
                "task.started",
                {
                    "agent": subtask["agent"],
                    "subTaskId": subtask_id,
                    "taskID": task_id,
                    "retry": True,
                },
            )
            result = await self._execute_subtask(task_id, subtask, aggregated)
            await self._store.mark_subtask_completed(task_id, subtask_id, result)
            await self._store.add_event(
                task_id,
                "task.completed",
                {
                    "agent": subtask["agent"],
                    "result": result,
                    "subTaskId": subtask_id,
                    "taskID": task_id,
                    "retry": True,
                },
            )
            return result
        return None

    async def cancel_runner(self, task_id: str) -> None:
        runner = self._store.runners.pop(task_id, None)
        if runner is None:
            return
        runner.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await runner

    async def _execute_subtask(
        self,
        task_id: str,
        subtask: dict[str, Any],
        aggregated: dict[str, Any],
    ) -> dict[str, Any]:
        task = await self._store.get_task(task_id)
        session_context = deepcopy((task or {}).get("sessionContext") or {})

        if subtask["toolkit"] == "webSearch":
            state = skills.resolve_state(session_context)
            query = f"{state['emotionLabel']} {state['actionLabel']} 音乐 歌单 推荐"
            search_started_ms = monotonic_ms()
            search_result = await self._search_toolkit.search_web(
                query=query,
                max_results=5,
                allowed_domains=[],
            )
            telemetry = self._store.telemetry_sessions.get(task_id)
            if telemetry is not None:
                telemetry.log_search(
                    query=query,
                    provider=search_result.get("provider", "unknown"),
                    result_count=len(search_result.get("sources") or []),
                    latency_ms=monotonic_ms() - search_started_ms,
                )
            fallback = skills.search_summary(
                query=query,
                session_context=session_context,
                task_id=task_id,
                subtask_id=subtask["subTaskId"],
            )
            fallback["sources"] = search_result.get("sources") or fallback["sources"]
            fallback["provider"] = search_result.get("provider", "unknown")
            fallback["summary"] = await self._summarize_search_results(
                task_id=task_id,
                query=query,
                search_result=search_result,
                fallback_summary=fallback["summary"],
            )
            return fallback

        if subtask["toolkit"] == "playlist":
            research = aggregated.get("webSearch") or {}
            fallback = skills.playlist(
                candidate_songs=[
                    {"id": self._synthetic_song_id(item.get("title", ""), index)}
                    for index, item in enumerate(research.get("sources") or [])
                ],
                session_context=session_context,
                task_id=task_id,
            )
            return await self._generate_playlist(
                task_id=task_id,
                research=research,
                session_context=session_context,
                fallback=fallback,
            )

        if subtask["toolkit"] == "multimodalEffect":
            fallback = skills.multimodal_effect(
                active_song=skills.get_nested(
                    session_context, "playback", "song", default={}
                ),
                quiet_mode=session_context.get("interactionMode") == "quiet"
                or not session_context.get("effectsEnabled", True),
                session_context=session_context,
            )
            return await self._generate_multimodal_effect(
                task_id=task_id,
                session_context=session_context,
                fallback=fallback,
            )

        if subtask["toolkit"] == "stamina":
            fallback = skills.stamina(
                session_minutes=int((task or {}).get("sessionMinutes") or 0),
                session_context=session_context,
                task_id=task_id,
            )
            return await self._generate_stamina_result(
                task_id=task_id,
                session_context=session_context,
                session_minutes=int((task or {}).get("sessionMinutes") or 0),
                fallback=fallback,
            )

        raise ValueError(f"Unknown toolkit: {subtask['toolkit']}")

    async def _generate_emotion_state(
        self,
        task_id: str,
        user_text: str,
        session_context: dict,
    ) -> dict:
        fallback = skills.emotion_selection(user_text)
        return await self._llm_json(
            task_id=task_id,
            name="emotion_selection",
            system_prompt=(
                "你是情绪团子后端的 emotion understanding agent。"
                "请根据用户输入和当前听歌语境，返回 JSON："
                '{"emotionId":"","actionId":"","confidence":0.0,"clarifyingQuestion":null}。'
                "只能使用已有情绪: calm/down/emo/energetic/focused/happy/healing/lonely/relaxed/romantic。"
                "只能使用已有动作: beachRelax/commuting/fitness/midnightEmo/sleeping/traveling。"
            ),
            user_prompt=(
                f"用户输入: {user_text}\n"
                f"当前上下文: {json_safe(session_context)}"
            ),
            fallback=fallback,
        )

    async def _summarize_search_results(
        self,
        task_id: str,
        query: str,
        search_result: dict,
        fallback_summary: str,
    ) -> str:
        sources = search_result.get("sources") or []
        payload = await self._llm_json(
            task_id=task_id,
            name="search_summary",
            system_prompt=(
                "你是 browser agent 的搜索总结器。"
                '请返回 JSON: {"summary": ""}。'
                "总结要强调适合当前情绪听歌的线索，不要虚构具体歌曲。"
            ),
            user_prompt=f"查询词: {query}\n搜索结果: {json_safe(sources)}",
            fallback={"summary": fallback_summary},
        )
        return payload.get("summary") or fallback_summary

    async def _generate_playlist(
        self,
        task_id: str,
        research: dict,
        session_context: dict,
        fallback: dict,
    ) -> dict:
        source_titles = [
            item.get("title")
            for item in (research.get("sources") or [])
            if item.get("title")
        ]
        result = await self._llm_json(
            task_id=task_id,
            name="playlist",
            system_prompt=(
                "你是 music recommendation agent。"
                "请根据搜索线索和当前状态，输出三阶段听歌旅程 JSON："
                '{"playlistTitle":"","explanation":"","journey":[{"stage":"","goal":"","songIds":[""]}]}。'
                "如果没有真实歌曲 ID，可以生成稳定的占位 songIds。"
            ),
            user_prompt=(
                f"当前上下文: {json_safe(session_context)}\n"
                f"搜索线索标题: {json_safe(source_titles)}\n"
                f"兜底结构: {json_safe(fallback)}"
            ),
            fallback=fallback,
        )
        if not result.get("journey"):
            return fallback
        normalized = deepcopy(result)
        for index, item in enumerate(normalized.get("journey") or []):
            if not item.get("songIds"):
                basis = source_titles[index] if index < len(source_titles) else item.get("stage", "")
                item["songIds"] = [self._synthetic_song_id(basis, index)]
        normalized.setdefault("taskID", fallback.get("taskID"))
        normalized.setdefault("playlistTitle", fallback.get("playlistTitle"))
        normalized.setdefault("explanation", fallback.get("explanation"))
        return normalized

    async def _generate_multimodal_effect(
        self,
        task_id: str,
        session_context: dict,
        fallback: dict,
    ) -> dict:
        return await self._llm_json(
            task_id=task_id,
            name="multimodal_effect",
            system_prompt=(
                "你是 multimodal listening effect agent。"
                "请输出 JSON，结构需兼容前端："
                '{"mode":"visualEffect","message":null,"sourceAgent":"multimodal_listening_effect_agent","cooldownSeconds":8,'
                '"audioSummary":{"energy":0.5,"lyricMood":"soft","structure":"verse","title":""},'
                '"effectPlan":[{"effectType":"breathRing","intensity":"low","position":"top","delayMs":0,"durationMs":1800}]}.'
            ),
            user_prompt=(
                f"当前上下文: {json_safe(session_context)}\n"
                f"兜底结构: {json_safe(fallback)}"
            ),
            fallback=fallback,
        )

    async def _generate_stamina_result(
        self,
        task_id: str,
        session_context: dict,
        session_minutes: int,
        fallback: dict,
    ) -> dict:
        return await self._llm_json(
            task_id=task_id,
            name="stamina",
            system_prompt=(
                "你是 emotion stamina agent。"
                '请输出 JSON: {"message": null, "shouldSuggest": false, "suggestionType": "none", "taskID": ""}。'
                "低落状态下避免说教，不要做心理诊断。"
            ),
            user_prompt=(
                f"会话分钟数: {session_minutes}\n"
                f"当前上下文: {json_safe(session_context)}\n"
                f"兜底结构: {json_safe(fallback)}"
            ),
            fallback=fallback,
        )

    async def _generate_chat_reply(
        self,
        task_id: str,
        message_type: str,
        state: dict,
        session_context: dict,
        multimodal_result: dict,
        stamina_result: dict,
    ) -> dict:
        fallback = {
            "actionId": state["actionId"],
            "emotionId": state["emotionId"],
            "interactionMode": state["interactionMode"],
            "message": "已在同一个任务里继续调整团子状态。"
            if message_type == "mascot_state_change"
            else "团子已经收到，会继续按当前任务陪你听。",
            "skinSuiteId": state.get("skinSuiteId"),
        }
        return await self._llm_json(
            task_id=task_id,
            name="chat_reply",
            system_prompt=(
                "你是情绪团子的对话协调 agent。"
                '请返回 JSON: {"actionId":"","emotionId":"","interactionMode":"","message":"","skinSuiteId":null}。'
                "文案要温和、短句、像陪伴型音乐伙伴。"
            ),
            user_prompt=(
                f"消息类型: {message_type}\n"
                f"当前状态: {json_safe(state)}\n"
                f"上下文: {json_safe(session_context)}\n"
                f"多模态结果: {json_safe(multimodal_result)}\n"
                f"续航建议: {json_safe(stamina_result)}\n"
                f"兜底结果: {json_safe(fallback)}"
            ),
            fallback=fallback,
        )

    async def _llm_json(
        self,
        task_id: str,
        name: str,
        system_prompt: str,
        user_prompt: str,
        fallback: dict,
    ) -> dict:
        telemetry = self._store.telemetry_sessions.get(task_id)
        started_ms = monotonic_ms()
        try:
            payload = await get_llm_client().chat_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            if telemetry is not None:
                telemetry.log_llm_call(
                    name=name,
                    latency_ms=monotonic_ms() - started_ms,
                    model=get_llm_client().model,
                    prompt_preview=user_prompt,
                )
            return payload
        except (LLMNotConfiguredError, Exception) as exc:  # noqa: BLE001
            logger.info("LLM fallback name=%s taskID=%s reason=%s", name, task_id, exc)
            return fallback

    @staticmethod
    def _synthetic_song_id(text: str, index: int) -> str:
        seed = hashlib.md5(f"{index}:{text}".encode("utf-8")).hexdigest()[:8]
        return f"song_{seed}"


class _null_lock:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def json_safe(payload: Any) -> str:
    try:
        import json

        return json.dumps(payload, ensure_ascii=False)
    except Exception:  # noqa: BLE001
        return str(payload)
