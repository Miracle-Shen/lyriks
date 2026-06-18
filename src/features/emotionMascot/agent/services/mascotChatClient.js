import { mascotWorkflows, runMascotWorkflow } from '../index';

const CHAT_CONFIG_KEY = 'emotionMascot.chatConfig.v1';
const CHAT_SESSION_KEY = 'emotionMascot.chatSession.v1';
let mascotEventSource = null;
let mascotEventTaskID = null;

const createId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readJson = (key) => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort persistence only.
  }
};

const getOrCreateSession = () => {
  const stored = readJson(CHAT_SESSION_KEY);
  if (stored?.sessionId) return stored;

  const session = {
    sessionId: createId('emotion-mascot'),
  };
  writeJson(CHAT_SESSION_KEY, session);
  return session;
};

const updateSession = (patch) => {
  const session = {
    ...getOrCreateSession(),
    ...patch,
  };
  writeJson(CHAT_SESSION_KEY, session);
  return session;
};

const getChatConfig = () => {
  const config = readJson(CHAT_CONFIG_KEY);
  if (!config) return null;

  return {
    api_key: config.apiKey,
    api_url: config.apiUrl,
    browser_port: config.browserPort ?? 9222,
    email: config.email ?? 'emotion-mascot@local.test',
    model_platform: config.modelPlatform ?? 'openai',
    model_type: config.modelType ?? 'gpt-4o-mini',
  };
};

const normalizeOption = (option = {}) => ({
  content: option.content ?? option.description ?? option.intent ?? option.shortLabel ?? '',
  description: option.description ?? option.intent ?? option.shortLabel ?? '',
  id: option.id ?? '',
  label: option.label ?? option.shortLabel ?? '',
});

const postMascotLoop = async (path, event, timeoutMs = 1200) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      body: JSON.stringify(event),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
};

const dispatchMascotEvent = (result) => {
  window.dispatchEvent(new CustomEvent('emotion-mascot-chat-event', { detail: result }));
};

const dispatchMascotTaskEvent = (detail) => {
  window.dispatchEvent(new CustomEvent('emotion-mascot-task-event', { detail }));
};

const closeMascotEventSource = () => {
  if (mascotEventSource) {
    mascotEventSource.close();
    mascotEventSource = null;
    mascotEventTaskID = null;
  }
};

const fetchTaskSnapshot = async (taskID) => {
  if (!taskID) return null;
  try {
    const response = await fetch(`/api/mascot/tasks/${taskID}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const subscribeMascotEvents = (taskID, sseUrl) => {
  if (!taskID || !sseUrl) return;
  if (mascotEventSource && mascotEventTaskID === taskID) return;

  closeMascotEventSource();
  mascotEventTaskID = taskID;
  mascotEventSource = new EventSource(sseUrl);

  const forwardEvent = async (eventName, event) => {
    const data = event?.data ? JSON.parse(event.data) : null;
    const shouldFetchSnapshot = eventName !== 'heartbeat';
    const snapshot = shouldFetchSnapshot ? await fetchTaskSnapshot(taskID) : null;
    dispatchMascotTaskEvent({
      data,
      event: eventName,
      snapshot,
      taskID,
    });
    if (eventName === 'task.closed') closeMascotEventSource();
  };

  ['task.created', 'task.started', 'task.progress', 'task.completed', 'task.failed', 'result.ready', 'task.stopped', 'task.closed', 'heartbeat'].forEach((eventName) => {
    mascotEventSource.addEventListener(eventName, (event) => {
      forwardEvent(eventName, event).catch(() => {});
    });
  });

  mascotEventSource.onerror = () => {
    dispatchMascotTaskEvent({
      event: 'sse.error',
      taskID,
    });
  };
};

const normalizeHandoverResult = (result, fallbackTaskID) => {
  const taskID = result?.taskID ?? fallbackTaskID;
  if (taskID) {
    updateSession({
      sseUrl: result.sseUrl ?? `/api/mascot/events?taskID=${taskID}`,
      taskID,
    });
  }

  return {
    ...result,
    sseUrl: result?.sseUrl ?? (taskID ? `/api/mascot/events?taskID=${taskID}` : null),
    taskID,
  };
};

const runLocalHandover = (event, taskID) => runMascotWorkflow(mascotWorkflows.handoverStart, {
  actionId: event.statePatch?.actionId ?? event.mascot_state?.actionId,
  emotionId: event.statePatch?.emotionId ?? event.mascot_state?.emotionId,
  handoverPlan: event.handoverPlan,
  sessionContext: event.sessionContext,
  taskID,
  userIntent: event.option?.description || event.option?.label || '',
});

const runLocalChat = (event, taskID) => runMascotWorkflow(mascotWorkflows.chat, {
  actionId: event.statePatch?.actionId ?? event.mascot_state?.actionId,
  activeSong: event.activeSong,
  effectsEnabled: event.sessionContext?.effectsEnabled,
  emotionId: event.statePatch?.emotionId ?? event.mascot_state?.emotionId,
  interactionMode: event.statePatch?.interactionMode,
  isPlaying: event.playback?.isPlaying,
  messageType: event.messageType ?? 'mascot_state_change',
  option: event.option,
  sessionContext: event.sessionContext,
  statePatch: event.statePatch,
  taskID,
  userText: event.option?.description || event.option?.label || '',
});

export const buildMascotChatEvent = ({
  activeSong,
  handoverPlan = null,
  option,
  playback = {},
  sessionContext = null,
  slot,
  source = 'mascot_state_selected',
  state = {},
  statePatch = {},
  taskID = null,
}) => {
  const session = getOrCreateSession();

  return {
    activeSong,
    chat_config: getChatConfig(),
    created_at: new Date().toISOString(),
    handoverPlan,
    mascot_state: state,
    messageType: slot === 'handover' ? 'handover' : 'mascot_state_change',
    option: normalizeOption(option),
    playback,
    sessionContext,
    session_id: session.sessionId,
    slot,
    source,
    statePatch,
    taskID: taskID ?? session.taskID ?? null,
  };
};

export const startMascotAgentLoop = async (event) => {
  const taskID = event.taskID ?? createId('task');
  const body = {
    clientRequestId: createId('req'),
    handoverAccepted: true,
    input: {
      trigger: event.source ?? 'today_handover',
      userText: event.option?.description || event.option?.label || '',
    },
    sessionContext: event.sessionContext,
  };

  try {
    const result = normalizeHandoverResult(await postMascotLoop('/api/mascot/handover', body), taskID);
    subscribeMascotEvents(result.taskID, result.sseUrl);
    dispatchMascotEvent(result);
    return result;
  } catch (error) {
    const result = normalizeHandoverResult(runLocalHandover(event, taskID), taskID);
    dispatchMascotEvent({
      ...result,
      fallbackReason: error.message,
      source: 'local_workforce_fallback',
    });
    return result;
  }
};

export const dispatchMascotChatEvent = async (event) => {
  const session = getOrCreateSession();
  const taskID = event.taskID ?? session.taskID;

  if (!taskID) {
    return {
      skipped: true,
      status: 'idle',
    };
  }

  const body = {
    messageType: event.messageType ?? 'mascot_state_change',
    sessionContext: event.sessionContext,
    statePatch: event.statePatch,
    taskID,
  };

  try {
    const result = await postMascotLoop('/api/mascot/chat', body);
    const sseUrl = session.sseUrl ?? `/api/mascot/events?taskID=${taskID}`;
    subscribeMascotEvents(taskID, sseUrl);
    dispatchMascotEvent(result);
    return result;
  } catch (error) {
    const result = {
      ...runLocalChat(event, taskID),
      fallbackReason: error.message,
      source: 'local_workforce_fallback',
    };
    dispatchMascotEvent(result);
    return result;
  }
};

export const stopMascotChatLoop = async (event = {}) => {
  const session = getOrCreateSession();
  const taskID = event.taskID ?? session.taskID;
  const stopPayload = {
    chat_config: getChatConfig(),
    mascot_state: event.mascot_state ?? {},
    option: normalizeOption(event.option),
    playback: event.playback ?? {},
    session_id: session.sessionId,
    slot: event.slot ?? 'mascot',
    source: event.source ?? 'mascot_hidden',
    taskID,
  };

  let result = {
    status: 'stopped',
    taskID,
  };

  if (taskID) {
    try {
      result = await postMascotLoop(`/api/mascot/tasks/${taskID}/cancel`, stopPayload);
    } catch {
      result = {
        ...result,
        source: 'local_workforce_fallback',
      };
    }
  }

  closeMascotEventSource();
  window.localStorage.removeItem(CHAT_SESSION_KEY);
  dispatchMascotEvent(result);
  return result;
};
