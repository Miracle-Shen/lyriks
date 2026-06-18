from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Optional

ACTION_EFFECT_POOLS = {
    "beachRelax": ["wave", "sunDot", "softWind"],
    "commuting": ["cityLight", "rhythmDot", "motionLine"],
    "fitness": ["energySpark", "motionLine", "rhythmDot"],
    "midnightEmo": ["rainDrop", "dimGlow", "lowWave"],
    "sleeping": ["moonDot", "star", "breathRing"],
    "traveling": ["mapPin", "cameraFlash", "routeLine"],
}

EMOTION_EFFECT_POOLS = {
    "calm": ["breathRing", "moonDot"],
    "down": ["dimGlow", "rainDrop"],
    "emo": ["rainDrop", "lowWave"],
    "energetic": ["energySpark", "rhythmDot"],
    "focused": ["rhythmDot", "cityLight"],
    "happy": ["sunDot", "energySpark"],
    "healing": ["softWind", "star"],
    "lonely": ["dimGlow", "star"],
    "relaxed": ["wave", "softWind"],
    "romantic": ["heartGlow", "sunDot"],
}

KEYWORD_MAP = [
    {
        "actionId": "fitness",
        "emotionId": "energetic",
        "keywords": ["运动", "跑步", "健身", "带劲", "高能"],
    },
    {
        "actionId": "sleeping",
        "emotionId": "calm",
        "keywords": ["睡", "助眠", "安静", "平静"],
    },
    {
        "actionId": "beachRelax",
        "emotionId": "relaxed",
        "keywords": ["放松", "海边", "chill", "松弛"],
    },
    {
        "actionId": "midnightEmo",
        "emotionId": "emo",
        "keywords": ["emo", "难过", "丧", "低落", "孤独"],
    },
    {
        "actionId": "commuting",
        "emotionId": "focused",
        "keywords": ["专注", "工作", "学习", "通勤"],
    },
    {
        "actionId": "traveling",
        "emotionId": "healing",
        "keywords": ["旅行", "路上", "城市", "散步"],
    },
]

POSITIONS = ["top", "right", "bottom-left", "top-right", "left"]

RECOMMENDATION_BY_TIME_BAND = {
    "afternoon": {
        "actionId": "commuting",
        "emotionId": "focused",
        "message": "下午我猜你可能需要稳一点，要进入专注通勤感吗？",
        "reason": "下午时段更适合稳定节奏和低干扰陪伴。",
    },
    "evening": {
        "actionId": "beachRelax",
        "emotionId": "relaxed",
        "message": "今天要不要让我用海边放松陪你听一会儿？",
        "reason": "晚上适合把节奏慢慢放下来。",
    },
    "lateNight": {
        "actionId": "midnightEmo",
        "emotionId": "emo",
        "message": "夜里我可以安静一点陪你，要进入深夜 EMO 吗？",
        "reason": "深夜更适合低亮度、慢节奏的陪听方式。",
    },
    "morning": {
        "actionId": "commuting",
        "emotionId": "energetic",
        "message": "早上要不要让我用元气通勤陪你开场？",
        "reason": "上午更适合轻轻唤醒和进入节奏。",
    },
}

FALLBACK_SONG_IDS = ["song_enter_1", "song_hold_1", "song_close_1"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_nested(data: dict, *path: str, default=None):
    current = data
    for key in path:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return default if current is None else current


def resolve_state(
    session_context: dict, state_patch: Optional[dict] = None
) -> dict[str, Optional[str]]:
    state_patch = state_patch or {}
    emotion = get_nested(session_context, "emotion", default={}) or {}
    action = get_nested(session_context, "action", default={}) or {}
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


def today_handover(session_context: dict) -> dict:
    time_band = session_context.get("timeBand") or "evening"
    base_plan = deepcopy(
        RECOMMENDATION_BY_TIME_BAND.get(time_band)
        or RECOMMENDATION_BY_TIME_BAND["evening"]
    )
    base_plan.update(
        {
            "shouldPrompt": session_context.get("handoverDate")
            != session_context.get("date"),
            "sourceAgent": "emotion_mascot_coordinator",
            "timeBand": time_band,
        }
    )
    return base_plan


def emotion_selection(text: str = "") -> dict:
    normalized_text = (text or "").lower()
    matched = next(
        (
            item
            for item in KEYWORD_MAP
            if any(keyword in normalized_text for keyword in item["keywords"])
        ),
        None,
    )
    if matched is not None:
        return {
            "actionId": matched["actionId"],
            "clarifyingQuestion": None,
            "confidence": 0.82,
            "emotionId": matched["emotionId"],
        }

    return {
        "actionId": "commuting",
        "clarifyingQuestion": "你更想安静放松，还是想被稍微带起来一点？",
        "confidence": 0.36,
        "emotionId": "calm",
    }


def create_plan(
    task_id: str,
    session_context: dict,
    handover_plan: dict,
    user_intent: str = "",
) -> dict:
    state = resolve_state(
        session_context,
        {
            "actionId": handover_plan.get("actionId"),
            "emotionId": handover_plan.get("emotionId"),
        },
    )
    state_label = f"{state['emotionLabel']} · {state['actionLabel']}"
    has_song = bool(
        get_nested(session_context, "playback", "song", "hasSong", default=False)
    )
    search_task = {
        "agent": "browser_agent",
        "dependsOn": [],
        "priority": 1,
        "status": "planned",
        "subTaskId": "subtask_001",
        "title": f"搜索适合「{state_label}」的听歌线索",
        "toolkit": "webSearch",
        "result": None,
        "error": None,
    }
    return {
        "confirmedState": {
            "actionId": state["actionId"],
            "emotionId": state["emotionId"],
        },
        "createdAt": now_iso(),
        "humanInteraction": "handover_accepted",
        "planId": f"plan_{task_id}",
        "summary": f"已根据「{user_intent}」为团子整理任务。"
        if user_intent
        else f"已为「{state_label}」整理接管任务。",
        "taskID": task_id,
        "tasks": [
            search_task,
            {
                "agent": "music_recommendation_agent",
                "dependsOn": [search_task["subTaskId"]],
                "priority": 2,
                "status": "planned",
                "subTaskId": "subtask_002",
                "title": f"生成「{state_label}」三阶段歌单旅程",
                "toolkit": "playlist",
                "result": None,
                "error": None,
            },
            {
                "agent": "multimodal_listening_effect_agent",
                "dependsOn": [],
                "priority": 2 if has_song else 3,
                "status": "planned",
                "subTaskId": "subtask_003",
                "title": "生成当前歌曲陪听特效"
                if has_song
                else "准备低打扰团子陪伴反馈",
                "toolkit": "multimodalEffect",
                "result": None,
                "error": None,
            },
            {
                "agent": "emotion_stamina_agent",
                "dependsOn": [],
                "priority": 3,
                "status": "planned",
                "subTaskId": "subtask_004",
                "title": "规划温和续航与状态转场策略",
                "toolkit": "stamina",
                "result": None,
                "error": None,
            },
        ],
    }


def build_initial_result(
    session_context: dict,
    user_text: str = "",
    handover_plan: Optional[dict] = None,
) -> dict:
    plan = handover_plan or today_handover(session_context)
    state = resolve_state(
        session_context,
        {
            "actionId": plan.get("actionId"),
            "emotionId": plan.get("emotionId"),
        },
    )
    return {
        "actionId": state["actionId"],
        "emotionId": state["emotionId"],
        "message": plan.get("message") or "团子已接管，会在同一个任务里继续陪你听。",
        "reason": user_text
        or plan.get("reason")
        or "用户确认接管后启动 Agent workforce。",
        "sourceAgent": "emotion_mascot_coordinator",
    }


def search_summary(
    query: str,
    session_context: dict,
    task_id: Optional[str],
    subtask_id: Optional[str],
) -> dict:
    state_label = (
        f"{get_nested(session_context, 'emotion', 'label', default='平静')} "
        f"{get_nested(session_context, 'action', 'shortLabel', default='陪听')}"
    )
    search_query = query or f"{state_label} 音乐 歌单 推荐"
    return {
        "agent": "browser_agent",
        "confidence": 0.64,
        "query": search_query,
        "retrievedAt": now_iso(),
        "sources": [
            {
                "summary": f"可围绕「{state_label}」寻找低打扰、状态匹配、可解释的歌曲线索。",
                "title": f"{state_label} 听歌线索",
                "url": "local://emotion-mascot/browser-agent/search-summary",
            }
        ],
        "summary": "当前为 Python Mascot Browser Agent 兜底摘要；后续可接真实搜索。",
        "subTaskId": subtask_id,
        "taskID": task_id,
    }


def playlist(
    candidate_songs: Optional[list[dict]],
    session_context: dict,
    target_emotion_id: Optional[str] = None,
    task_id: Optional[str] = None,
) -> dict:
    candidate_songs = candidate_songs or []
    song_ids = [
        song.get("id")
        or song.get("key")
        or get_nested(song, "attributes", "playParams", "id")
        for song in candidate_songs
    ]
    song_ids = [item for item in song_ids if item] or FALLBACK_SONG_IDS
    first = song_ids[0]
    second = song_ids[min(1, len(song_ids) - 1)]
    third = song_ids[min(2, len(song_ids) - 1)]
    target_label = target_emotion_id or get_nested(
        session_context, "emotion", "id", default="calm"
    )
    return {
        "explanation": "这组歌会先承认当前状态，再慢慢把听感整理得更舒服。",
        "journey": [
            {
                "goal": "进入状态",
                "songIds": song_ids[:3] or [first],
                "stage": "进入状态",
            },
            {
                "goal": (
                    "维持 "
                    f"{get_nested(session_context, 'action', 'shortLabel', default='当前状态')}"
                    " 的听感"
                ),
                "songIds": song_ids[3:6] or [second],
                "stage": "保持氛围",
            },
            {
                "goal": f"向 {target_label} 温柔收尾",
                "songIds": song_ids[6:9] or [third],
                "stage": "温柔收尾",
            },
        ],
        "playlistTitle": (
            f"{get_nested(session_context, 'emotion', 'label', default='平静')} · "
            f"{get_nested(session_context, 'action', 'shortLabel', default='陪听')}"
        ),
        "taskID": task_id or session_context.get("taskID"),
    }


def _audio_summary(active_song: Optional[dict], is_playing: bool) -> dict:
    attributes = (active_song or {}).get("attributes") or {}
    title = attributes.get("name") or ""
    artist = attributes.get("artistName") or ""
    seed = len(f"{title}{artist}")
    energy = 0.42 + ((seed % 7) * 0.08) if is_playing else 0
    if seed % 5 == 0:
        structure = "chorus"
    elif seed % 3 == 0:
        structure = "verse"
    else:
        structure = "ambient"
    return {
        "energy": min(0.96, energy),
        "lyricMood": "soft" if seed % 2 == 0 else "bright",
        "structure": structure,
        "title": title,
    }


def multimodal_effect(
    active_song: Optional[dict],
    quiet_mode: bool,
    session_context: dict,
) -> dict:
    is_playing = bool(get_nested(session_context, "playback", "isPlaying", default=False))
    audio_summary = _audio_summary(active_song, is_playing)
    action_id = get_nested(session_context, "action", "id", default="commuting")
    emotion_id = get_nested(session_context, "emotion", "id", default="calm")
    effect_pool = list(
        dict.fromkeys(
            [
                *ACTION_EFFECT_POOLS.get(action_id, []),
                *EMOTION_EFFECT_POOLS.get(emotion_id, []),
                "breathRing",
            ]
        )
    )
    effect_count = 1 if quiet_mode else max(1, min(3, round(audio_summary["energy"] * 3)))
    duration_base = 1400 if quiet_mode else 1500 + round(audio_summary["energy"] * 900)

    return {
        "audioSummary": audio_summary,
        "cooldownSeconds": 16 if quiet_mode else 7 + round((1 - audio_summary["energy"]) * 8),
        "effectPlan": [
            {
                "delayMs": index * 260,
                "durationMs": duration_base + (index * 160),
                "effectType": effect_pool[index % len(effect_pool)],
                "intensity": "low"
                if quiet_mode or audio_summary["energy"] < 0.6
                else "medium",
                "position": POSITIONS[(index + len(f"{action_id}{emotion_id}")) % len(POSITIONS)],
            }
            for index in range(effect_count)
        ],
        "message": None,
        "mode": "visualEffect",
        "sourceAgent": "multimodal_listening_effect_agent",
    }


def stamina(
    session_minutes: int,
    session_context: dict,
    task_id: Optional[str] = None,
) -> dict:
    emotion_id = get_nested(session_context, "emotion", "id", default="calm")
    sensitive = emotion_id in {"down", "emo", "lonely"}
    should_suggest = session_minutes >= (38 if sensitive else 52)
    return {
        "message": "要不要我帮你把后面几首慢慢换得更治愈一点？"
        if should_suggest
        else None,
        "shouldSuggest": should_suggest,
        "suggestionType": "gentleTransition" if should_suggest else "none",
        "taskID": task_id or session_context.get("taskID"),
    }
