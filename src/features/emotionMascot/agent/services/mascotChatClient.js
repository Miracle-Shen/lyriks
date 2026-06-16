const CHAT_CONFIG_KEY = 'emotionMascot.chatConfig.v1';
const CHAT_SESSION_KEY = 'emotionMascot.chatSession.v1';

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

const postMascotLoop = async (path, event) => {
  const response = await fetch(path, {
    body: JSON.stringify(event),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `HTTP ${response.status}`);
  }

  return response.json();
};

export const buildMascotChatEvent = ({
  option,
  playback = {},
  slot,
  source = 'mascot_state_selected',
  state = {},
}) => {
  const session = getOrCreateSession();

  return {
    chat_config: getChatConfig(),
    created_at: new Date().toISOString(),
    mascot_state: state,
    option: normalizeOption(option),
    playback,
    session_id: session.sessionId,
    slot,
    source,
  };
};

export const startMascotAgentLoop = async (event) => {
  const result = await postMascotLoop('/emotion-mascot-agent/loop/start', event);
  window.dispatchEvent(new CustomEvent('emotion-mascot-chat-event', { detail: result }));
  return result;
};

export const dispatchMascotChatEvent = async (event) => {
  const result = await postMascotLoop('/emotion-mascot-agent/loop/event', event);
  window.dispatchEvent(new CustomEvent('emotion-mascot-chat-event', { detail: result }));
  return result;
};

export const stopMascotChatLoop = async (event = {}) => {
  const session = getOrCreateSession();
  const result = await postMascotLoop('/emotion-mascot-agent/loop/stop', {
    chat_config: getChatConfig(),
    mascot_state: event.mascot_state ?? {},
    option: normalizeOption(event.option),
    playback: event.playback ?? {},
    session_id: session.sessionId,
    slot: event.slot ?? 'mascot',
    source: event.source ?? 'mascot_hidden',
  });

  window.localStorage.removeItem(CHAT_SESSION_KEY);
  window.dispatchEvent(new CustomEvent('emotion-mascot-chat-event', { detail: result }));
  return result;
};
