import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import AgentHandoverBubble from './components/AgentHandoverBubble';
import MascotFigure from './components/MascotFigure';
import MascotSettingsModal from './components/MascotSettingsModal';
import MultimodalEffectLayer from './components/MultimodalEffectLayer';
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
    effectsEnabled,
    emotionId,
    handoverStatus,
    mascotIndex,
    markTodayHandover,
    setActionId,
    setEffectsEnabled,
    setEmotionId,
    setMascotById,
    setSkinSuiteId,
    skinSuiteId,
  } = useEmotionMascot();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const hasSong = Boolean(activeSong?.attributes?.name);
  const isDiscoverPage = location.pathname === '/';
  const activeMascot = mascotVariants[mascotIndex];
  const isMascotHidden = activeMascot?.id === 'hidden';
  const shouldShowMascot = (hasSong || isDiscoverPage) && !isMascotHidden;
  const isAgentLoopActive = handoverStatus === 'accepted' && !isMascotHidden;
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
  }, [actionId, availableActions]);

  const dispatchSelectionEvent = useCallback((slot, option) => {
    if (!isAgentLoopActive) return;

    dispatchMascotChatEvent(buildMascotChatEvent({
      option,
      playback: {
        isPlaying,
        song: activeSong?.attributes?.name ?? '',
      },
      slot,
      state: {
        actionId: actionState.id,
        actionLabel: actionState.label,
        emotionId: emotionState.id,
        emotionLabel: emotionState.label,
      },
    })).catch((error) => {
      console.warn('Emotion mascot Agent event failed', error);
    });
  }, [actionState.id, actionState.label, activeSong, emotionState.id, emotionState.label, isAgentLoopActive, isPlaying]);

  const handleMascotChange = useCallback((nextMascotId, option) => {
    if (nextMascotId === 'hidden') {
      dispatchSelectionEvent('mascot', option);
      setMascotById(nextMascotId);
      markTodayHandover('dismissed');
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
      }).catch((error) => {
        console.warn('Emotion mascot Agent loop failed to stop', error);
      });
      return;
    }

    setMascotById(nextMascotId);
    dispatchSelectionEvent('mascot', option);
  }, [
    actionState.id,
    actionState.label,
    activeSong,
    dispatchSelectionEvent,
    emotionState.id,
    emotionState.label,
    isPlaying,
    markTodayHandover,
    setMascotById,
  ]);

  const handleEmotionChange = useCallback((nextEmotionId, option) => {
    setEmotionId(nextEmotionId);
    dispatchSelectionEvent('emotion', option);
  }, [dispatchSelectionEvent, setEmotionId]);

  const handleActionChange = useCallback((nextActionId, option) => {
    setActionId(nextActionId);
    dispatchSelectionEvent('action', option);
  }, [dispatchSelectionEvent, setActionId]);

  const handleSkinSuiteChange = useCallback((nextSkinSuiteId, option) => {
    setSkinSuiteId(nextSkinSuiteId);
    dispatchSelectionEvent('skinSuite', option);
  }, [dispatchSelectionEvent, setSkinSuiteId]);

  const handleEffectsEnabledChange = useCallback((nextEffectsEnabled) => {
    setEffectsEnabled(nextEffectsEnabled);
    dispatchSelectionEvent('effectsEnabled', {
      description: nextEffectsEnabled ? '播放时生成短暂情绪反馈' : '停止播放时的情绪反馈特效',
      id: nextEffectsEnabled ? 'on' : 'off',
      label: nextEffectsEnabled ? '开启多模态陪听特效' : '关闭多模态陪听特效',
    });
  }, [dispatchSelectionEvent, setEffectsEnabled]);

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
            emotionState={emotionState}
            isDiscoverPage={isDiscoverPage}
            isSettingsOpen={isSettingsOpen}
            onOpenSettings={handleOpenSettings}
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
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FloatingBeatMascot;
