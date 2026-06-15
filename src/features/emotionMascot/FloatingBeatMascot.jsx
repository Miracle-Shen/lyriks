import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import MascotFigure from './components/MascotFigure';
import MascotSettingsModal from './components/MascotSettingsModal';
import { actionStates, getActionById, getAvailableActions } from './config/actionStates';
import { defaultEmotionId, emotionStates, getEmotionById } from './config/emotionStates';
import { MASCOT_SIZE } from './config/layout';
import { mascotVariants } from './config/mascotVariants';
import { defaultSkinSuiteId, getSkinSuiteById, skinSuites } from './config/skinSuites';
import { useBeatMotion } from './hooks/useBeatMotion';
import { useFloatingPosition } from './hooks/useFloatingPosition';

const getInitialActionId = (emotionId) => getAvailableActions(emotionId)[0]?.id ?? actionStates[0].id;

const FloatingBeatMascot = () => {
  const { activeSong, isPlaying } = useSelector((state) => state.player);
  const { audioElement } = useAudioPlayer();
  const [mascotIndex, setMascotIndex] = useState(0);
  const [emotionId, setEmotionId] = useState(defaultEmotionId);
  const [actionId, setActionId] = useState(getInitialActionId(defaultEmotionId));
  const [skinSuiteId, setSkinSuiteId] = useState(defaultSkinSuiteId);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const hasSong = Boolean(activeSong?.attributes?.name);
  const activeMascot = mascotVariants[mascotIndex];
  const emotionState = getEmotionById(emotionId);
  const availableActions = useMemo(() => getAvailableActions(emotionState.id), [emotionState.id]);
  const actionState = getActionById(actionId);
  const skinSuite = getSkinSuiteById(skinSuiteId);
  const motion = useBeatMotion({
    audioElement,
    enabled: hasSong,
    isPlaying,
    motionProfile: emotionState.expression.motion,
  });

  useEffect(() => {
    if (!availableActions.some((action) => action.id === actionId)) {
      setActionId(availableActions[0]?.id ?? actionStates[0].id);
    }
  }, [actionId, availableActions]);

  const handleMascotChange = useCallback((nextMascotId) => {
    const nextMascotIndex = mascotVariants.findIndex((mascot) => mascot.id === nextMascotId);
    if (nextMascotIndex >= 0) {
      setMascotIndex(nextMascotIndex);
    }
  }, []);

  const handleEmotionChange = useCallback((nextEmotionId) => {
    setEmotionId(nextEmotionId);
    setActionId(getInitialActionId(nextEmotionId));
  }, []);

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
    resetKey: hasSong,
  });

  if (!hasSong) return null;

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
          <MascotFigure
            actionState={actionState}
            emotionState={emotionState}
            isDragging={isDragging}
            isPlaying={isPlaying}
            mascot={activeMascot}
            motion={motion}
            skinSuite={skinSuite}
          />
          {isSettingsOpen ? (
            <MascotSettingsModal
              actionState={actionState}
              actionStates={actionStates}
              availableActions={availableActions}
              emotionState={emotionState}
              emotionStates={emotionStates}
              mascot={activeMascot}
              mascotVariants={mascotVariants}
              onActionChange={setActionId}
              onClose={handleCloseSettings}
              onEmotionChange={handleEmotionChange}
              onMascotChange={handleMascotChange}
              onSkinSuiteChange={setSkinSuiteId}
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
