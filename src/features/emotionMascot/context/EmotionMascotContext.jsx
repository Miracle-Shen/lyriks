import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { actionStates, getActionById, getAvailableActions } from '../config/actionStates';
import { defaultEmotionId, getEmotionById } from '../config/emotionStates';
import { mascotVariants } from '../config/mascotVariants';
import { defaultSkinSuiteId } from '../config/skinSuites';

const STORAGE_KEY = 'emotionMascot.agentState.v1';

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const date = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
};

export const getInitialActionId = (emotionId) => (
  getAvailableActions(emotionId)[0]?.id ?? actionStates[0].id
);

const readStoredState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
};

const EmotionMascotContext = createContext(null);

export const EmotionMascotProvider = ({ children }) => {
  const [state, setState] = useState(() => {
    const stored = readStoredState();
    const emotionId = getEmotionById(stored.emotionId)?.id ?? defaultEmotionId;
    const actionId = getAvailableActions(emotionId).some((action) => action.id === stored.actionId)
      ? stored.actionId
      : getInitialActionId(emotionId);
    const mascotIndex = mascotVariants[stored.mascotIndex] ? stored.mascotIndex : 0;

    return {
      actionId,
      agentReply: stored.agentReply ?? null,
      effectsEnabled: stored.effectsEnabled ?? true,
      emotionId,
      handoverDate: stored.handoverDate ?? null,
      handoverStatus: stored.handoverStatus ?? null,
      mascotIndex,
      skinSuiteId: stored.skinSuiteId ?? defaultSkinSuiteId,
      taskID: stored.taskID ?? null,
      taskPlan: stored.taskPlan ?? null,
      taskStatus: stored.taskStatus ?? 'idle',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Local persistence is a convenience; the mascot still works without it.
    }
  }, [state]);

  const setEmotionId = useCallback((nextEmotionId) => {
    const nextEmotion = getEmotionById(nextEmotionId);
    setState((current) => ({
      ...current,
      actionId: getInitialActionId(nextEmotion.id),
      emotionId: nextEmotion.id,
    }));
  }, []);

  const setActionId = useCallback((nextActionId) => {
    setState((current) => {
      const action = getActionById(nextActionId);
      if (!action.allowedEmotionIds.includes(current.emotionId)) return current;

      return {
        ...current,
        actionId: action.id,
      };
    });
  }, []);

  const setMascotById = useCallback((nextMascotId) => {
    setState((current) => {
      const nextMascotIndex = mascotVariants.findIndex((mascot) => mascot.id === nextMascotId);
      if (nextMascotIndex < 0) return current;

      return {
        ...current,
        mascotIndex: nextMascotIndex,
      };
    });
  }, []);

  const setSkinSuiteId = useCallback((nextSkinSuiteId) => {
    setState((current) => ({
      ...current,
      skinSuiteId: nextSkinSuiteId,
    }));
  }, []);

  const applyAgentState = useCallback(({ actionId, emotionId }) => {
    const nextEmotion = getEmotionById(emotionId);
    const availableActions = getAvailableActions(nextEmotion.id);
    const nextActionId = availableActions.some((action) => action.id === actionId)
      ? actionId
      : getInitialActionId(nextEmotion.id);

    setState((current) => ({
      ...current,
      actionId: nextActionId,
      emotionId: nextEmotion.id,
    }));
  }, []);

  const applyMascotStatePatch = useCallback((patch = {}) => {
    setState((current) => {
      const nextEmotion = patch.emotionId
        ? getEmotionById(patch.emotionId)
        : getEmotionById(current.emotionId);
      const availableActions = getAvailableActions(nextEmotion.id);
      const nextActionId = patch.actionId && availableActions.some((action) => action.id === patch.actionId)
        ? patch.actionId
        : current.actionId;

      return {
        ...current,
        actionId: availableActions.some((action) => action.id === nextActionId)
          ? nextActionId
          : getInitialActionId(nextEmotion.id),
        effectsEnabled: typeof patch.effectsEnabled === 'boolean'
          ? patch.effectsEnabled
          : current.effectsEnabled,
        emotionId: nextEmotion.id,
        mascotIndex: typeof patch.mascotIndex === 'number'
          ? patch.mascotIndex
          : current.mascotIndex,
        skinSuiteId: patch.skinSuiteId ?? current.skinSuiteId,
      };
    });
  }, []);

  const setAgentTask = useCallback(({
    agentReply = null,
    plan = null,
    status = 'running',
    taskID,
  }) => {
    setState((current) => ({
      ...current,
      agentReply,
      taskID: taskID ?? current.taskID,
      taskPlan: plan ?? current.taskPlan,
      taskStatus: status,
    }));
  }, []);

  const updateAgentReply = useCallback((agentReply, status = 'running') => {
    setState((current) => ({
      ...current,
      agentReply,
      taskStatus: status,
    }));
  }, []);

  const clearAgentTask = useCallback(() => {
    setState((current) => ({
      ...current,
      agentReply: null,
      taskID: null,
      taskPlan: null,
      taskStatus: 'idle',
    }));
  }, []);

  const markTodayHandover = useCallback((handoverStatus) => {
    setState((current) => ({
      ...current,
      handoverDate: getTodayKey(),
      handoverStatus,
    }));
  }, []);

  const setEffectsEnabled = useCallback((effectsEnabled) => {
    setState((current) => ({
      ...current,
      effectsEnabled,
    }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    applyAgentState,
    applyMascotStatePatch,
    clearAgentTask,
    markTodayHandover,
    setActionId,
    setAgentTask,
    setEffectsEnabled,
    setEmotionId,
    setMascotById,
    setSkinSuiteId,
    todayKey: getTodayKey(),
    updateAgentReply,
  }), [
    applyAgentState,
    applyMascotStatePatch,
    clearAgentTask,
    markTodayHandover,
    setActionId,
    setAgentTask,
    setEffectsEnabled,
    setEmotionId,
    setMascotById,
    setSkinSuiteId,
    state,
    updateAgentReply,
  ]);

  return (
    <EmotionMascotContext.Provider value={value}>
      {children}
    </EmotionMascotContext.Provider>
  );
};

export const useEmotionMascot = () => {
  const context = useContext(EmotionMascotContext);
  if (!context) {
    throw new Error('useEmotionMascot must be used within EmotionMascotProvider');
  }
  return context;
};
