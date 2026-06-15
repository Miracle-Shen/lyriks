import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import MascotFigure from './components/MascotFigure';
import MascotStatusPanel from './components/MascotStatusPanel';
import { actionStates, getActionById, getAvailableActions } from './config/actionStates';
import { defaultEmotionId, emotionStates, getEmotionById } from './config/emotionStates';
import { MASCOT_SIZE } from './config/layout';
import { mascotVariants } from './config/mascotVariants';
import { useBeatMotion } from './hooks/useBeatMotion';
import { useFloatingPosition } from './hooks/useFloatingPosition';

const getInitialActionId = (emotionId) => getAvailableActions(emotionId)[0]?.id ?? actionStates[0].id;

const FloatingBeatMascot = () => {
  const { activeSong, isPlaying } = useSelector((state) => state.player);
  const { audioElement } = useAudioPlayer();
  const [mascotIndex, setMascotIndex] = useState(0);
  const [emotionId, setEmotionId] = useState(defaultEmotionId);
  const [actionId, setActionId] = useState(getInitialActionId(defaultEmotionId));
  const hasSong = Boolean(activeSong?.attributes?.name);
  const activeMascot = mascotVariants[mascotIndex];
  const emotionState = getEmotionById(emotionId);
  const availableActions = useMemo(() => getAvailableActions(emotionState.id), [emotionState.id]);
  const actionState = getActionById(actionId);
  const motion = useBeatMotion({
    audioElement,
    enabled: hasSong,
    isPlaying,
    motionProfile: emotionState.expression.motion,
  });

  const songMeta = useMemo(() => ({
    artist: activeSong?.attributes?.artistName || '',
    title: activeSong?.attributes?.name || '',
  }), [activeSong]);

  useEffect(() => {
    if (!availableActions.some((action) => action.id === actionId)) {
      setActionId(availableActions[0]?.id ?? actionStates[0].id);
    }
  }, [actionId, availableActions]);

  const handleMascotChange = useCallback(() => {
    setMascotIndex((currentIndex) => (currentIndex + 1) % mascotVariants.length);
  }, []);

  const handleEmotionChange = useCallback((nextEmotionId) => {
    setEmotionId(nextEmotionId);
    setActionId(getInitialActionId(nextEmotionId));
  }, []);

  const {
    handlePointerDown,
    isDragging,
    position,
  } = useFloatingPosition({
    onClick: handleMascotChange,
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
          />
          <MascotStatusPanel
            actionState={actionState}
            availableActions={availableActions}
            emotionState={emotionState}
            emotionStates={emotionStates}
            mascot={activeMascot}
            onActionChange={setActionId}
            onEmotionChange={handleEmotionChange}
            onMascotChange={handleMascotChange}
            songMeta={songMeta}
          />
        </div>
      </div>
    </div>
  );
};

export default FloatingBeatMascot;

