import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import AgentHandoverBubble from './components/AgentHandoverBubble';
import MascotFigure from './components/MascotFigure';
import MascotSettingsModal from './components/MascotSettingsModal';
import MultimodalEffectLayer from './components/MultimodalEffectLayer';
import { buildMascotSessionContext } from './agent';
import {
  buildMascotChatEvent,
  dispatchMascotChatEvent,
  stopMascotChatLoop,
} from './agent/services/mascotChatClient';
import { actionStates, getActionById, getAvailableActions } from './config/actionStates';
import { emotionStates, getEmotionById } from './config/emotionStates';
import { MASCOT_SIZE } from './config/layout';
import { mascotVariants } from './config/mascotVariants';
import { getSkinSuiteById, skinSuites } from './config/skinSuites';
import { useEmotionMascot } from './context/EmotionMascotContext';
import { useBeatMotion } from './hooks/useBeatMotion';
import { useFloatingPosition } from './hooks/useFloatingPosition';

const FloatingBeatMascot = () => {
  const { activeSong, isPlaying } = useSelector((state) => state.player);
  const { audioElement } = useAudioPlayer();
  const location = useLocation();
  const {
    actionId,
    agentReply,
    clearAgentTask,
    effectsEnabled,
    emotionId,
    handoverStatus,
    mascotIndex,
    markTodayHandover,
    setActionId,
    setAgentTask,
    setEffectsEnabled,
    setEmotionId,
    setMascotById,
    setSkinSuiteId,
    skinSuiteId,
    taskID,
    taskPlan,
    taskStatus,
    updateAgentReply,
  } = useEmotionMascot();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const hasSong = Boolean(activeSong?.attributes?.name);
  const isDiscoverPage = location.pathname === '/';
  const activeMascot = mascotVariants[mascotIndex];
  const isMascotHidden = activeMascot?.id === 'hidden';
  const shouldShowMascot = (hasSong || isDiscoverPage) && !isMascotHidden;
  const isAgentLoopActive = handoverStatus === 'accepted' && Boolean(taskID) && !isMascotHidden;
  const emotionState = getEmotionById(emotionId);
  const availableActions = useMemo(() => getAvailableActions(emotionState.id), [emotionState.id]);
  const actionState = getActionById(actionId);
  const skinSuite = getSkinSuiteById(skinSuiteId);
  const motion = useBeatMotion({
    audioElement,
    enabled: shouldShowMascot,
    isPlaying,
    motionProfile: emotionState.expression.motion,
  });

  useEffect(() => {
    if (!availableActions.some((action) => action.id === actionId)) {
      setActionId(availableActions[0]?.id ?? actionStates[0].id);
    }
  }, [actionId, availableActions, setActionId]);

  const getSessionContext = useCallback((statePatch = {}) => buildMascotSessionContext({
    actionId: statePatch.actionId ?? actionState.id,
    activeSong,
    effectsEnabled: statePatch.effectsEnabled ?? effectsEnabled,
    emotionId: statePatch.emotionId ?? emotionState.id,
    handoverDate: null,
    interactionMode: statePatch.interactionMode ?? 'normal',
    isDragging: false,
    isPlaying,
    isSettingsOpen,
    page: location.pathname === '/play' ? 'play' : 'discover',
    taskID,
  }), [
    actionState.id,
    activeSong,
    effectsEnabled,
    emotionState.id,
    isPlaying,
    isSettingsOpen,
    location.pathname,
    taskID,
  ]);

  const dispatchSelectionEvent = useCallback((slot, option, statePatch = {}) => {
    if (!isAgentLoopActive) return;

    dispatchMascotChatEvent(buildMascotChatEvent({
      activeSong,
      option,
      playback: {
        isPlaying,
        song: activeSong?.attributes?.name ?? '',
      },
      sessionContext: getSessionContext(statePatch),
      slot,
      state: {
        actionId: actionState.id,
        actionLabel: actionState.label,
        emotionId: emotionState.id,
        emotionLabel: emotionState.label,
      },
      statePatch,
      taskID,
    })).catch((error) => {
      console.warn('Emotion mascot Agent event failed', error);
    }).then((result) => {
      if (result?.reply) updateAgentReply(result.reply, result.status);
    });
  }, [
    actionState.id,
    actionState.label,
    activeSong,
    emotionState.id,
    emotionState.label,
    getSessionContext,
    isAgentLoopActive,
    isPlaying,
    taskID,
    updateAgentReply,
  ]);

  const handleMascotChange = useCallback((nextMascotId, option) => {
    if (nextMascotId === 'hidden') {
      dispatchSelectionEvent('mascot', option);
      setMascotById(nextMascotId);
      markTodayHandover('dismissed');
      clearAgentTask();
      setIsSettingsOpen(false);
      stopMascotChatLoop({
        option,
        slot: 'mascot',
        source: 'mascot_hidden',
        mascot_state: {
          actionId: actionState.id,
          actionLabel: actionState.label,
          emotionId: emotionState.id,
          emotionLabel: emotionState.label,
        },
        playback: {
          isPlaying,
          song: activeSong?.attributes?.name ?? '',
        },
        taskID,
      }).catch((error) => {
        console.warn('Emotion mascot Agent loop failed to stop', error);
      });
      return;
    }

    if (!taskID) return;

    setMascotById(nextMascotId);
    dispatchSelectionEvent('mascot', option, {
      mascotId: nextMascotId,
    });
  }, [
    actionState.id,
    actionState.label,
    activeSong,
    dispatchSelectionEvent,
    emotionState.id,
    emotionState.label,
    isPlaying,
    markTodayHandover,
    clearAgentTask,
    setMascotById,
    taskID,
  ]);

  const handleEmotionChange = useCallback((nextEmotionId, option) => {
    if (!taskID) return;

    const nextActionId = getAvailableActions(nextEmotionId)[0]?.id ?? actionStates[0].id;
    setEmotionId(nextEmotionId);
    dispatchSelectionEvent('emotion', option, {
      actionId: nextActionId,
      emotionId: nextEmotionId,
    });
  }, [dispatchSelectionEvent, setEmotionId, taskID]);

  const handleActionChange = useCallback((nextActionId, option) => {
    if (!taskID) return;

    setActionId(nextActionId);
    dispatchSelectionEvent('action', option, {
      actionId: nextActionId,
      emotionId,
    });
  }, [dispatchSelectionEvent, emotionId, setActionId, taskID]);

  const handleSkinSuiteChange = useCallback((nextSkinSuiteId, option) => {
    if (!taskID) return;

    setSkinSuiteId(nextSkinSuiteId);
    dispatchSelectionEvent('skinSuite', option, {
      skinSuiteId: nextSkinSuiteId,
    });
  }, [dispatchSelectionEvent, setSkinSuiteId, taskID]);

  const handleEffectsEnabledChange = useCallback((nextEffectsEnabled) => {
    if (!taskID) return;

    setEffectsEnabled(nextEffectsEnabled);
    dispatchSelectionEvent('effectsEnabled', {
      description: nextEffectsEnabled ? '播放时生成短暂情绪反馈' : '停止播放时的情绪反馈特效',
      id: nextEffectsEnabled ? 'on' : 'off',
      label: nextEffectsEnabled ? '开启多模态陪听特效' : '关闭多模态陪听特效',
    }, {
      effectsEnabled: nextEffectsEnabled,
      interactionMode: nextEffectsEnabled ? 'normal' : 'quiet',
    });
  }, [dispatchSelectionEvent, setEffectsEnabled, taskID]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const {
    handlePointerDown,
    isDragging,
    position,
  } = useFloatingPosition({
    onClick: handleOpenSettings,
    resetKey: shouldShowMascot,
  });

  if (!shouldShowMascot) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="pointer-events-auto absolute select-none"
        onPointerDown={handlePointerDown}
        role="presentation"
        style={{
          left: position.x,
          top: position.y,
          touchAction: 'none',
          width: `${MASCOT_SIZE}px`,
        }}
      >
        <div className="relative flex cursor-grab flex-col items-center active:cursor-grabbing">
          <AgentHandoverBubble
            actionState={actionState}
            activeSong={activeSong}
            effectsEnabled={effectsEnabled}
            emotionState={emotionState}
            getSessionContext={getSessionContext}
            isDiscoverPage={isDiscoverPage}
            isPlaying={isPlaying}
            isSettingsOpen={isSettingsOpen}
            onOpenSettings={handleOpenSettings}
            setAgentTask={setAgentTask}
            taskID={taskID}
          />
          <MascotFigure
            actionState={actionState}
            emotionState={emotionState}
            isDragging={isDragging}
            isPlaying={isPlaying}
            mascot={activeMascot}
            motion={motion}
            skinSuite={skinSuite}
          />
          <MultimodalEffectLayer
            actionState={actionState}
            activeSong={activeSong}
            agentLoopActive={isAgentLoopActive}
            effectsEnabled={effectsEnabled}
            emotionState={emotionState}
            isDragging={isDragging}
            isPlaying={isPlaying}
            isSettingsOpen={isSettingsOpen}
          />
          {isSettingsOpen ? (
            <MascotSettingsModal
              actionState={actionState}
              actionStates={actionStates}
              availableActions={availableActions}
              effectsEnabled={effectsEnabled}
              emotionState={emotionState}
              emotionStates={emotionStates}
              agentReply={agentReply}
              mascot={activeMascot}
              mascotVariants={mascotVariants}
              onActionChange={handleActionChange}
              onClose={handleCloseSettings}
              onEffectsEnabledChange={handleEffectsEnabledChange}
              onEmotionChange={handleEmotionChange}
              onMascotChange={handleMascotChange}
              onSkinSuiteChange={handleSkinSuiteChange}
              skinSuite={skinSuite}
              skinSuites={skinSuites}
              taskID={taskID}
              taskPlan={taskPlan}
              taskStatus={taskStatus}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FloatingBeatMascot;
