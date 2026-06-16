import { useEffect, useRef, useState } from 'react';

import { runMultimodalEffectWorkflow } from '../agent';

const MAX_EFFECTS = 7;

const getEffectClassName = (effectType) => {
  const allowedEffectTypes = new Set([
    'breathRing',
    'cameraFlash',
    'cityLight',
    'dimGlow',
    'energySpark',
    'heartGlow',
    'lowWave',
    'mapPin',
    'moonDot',
    'motionLine',
    'rainDrop',
    'rhythmDot',
    'routeLine',
    'softWind',
    'star',
    'sunDot',
    'wave',
  ]);

  return allowedEffectTypes.has(effectType) ? effectType : 'breathRing';
};

const MultimodalEffectLayer = ({
  actionState,
  activeSong,
  agentLoopActive,
  effectsEnabled,
  emotionState,
  isDragging,
  isPlaying,
  isSettingsOpen,
}) => {
  const [effects, setEffects] = useState([]);
  const timeoutRef = useRef(null);
  const shouldRun = Boolean(
    activeSong?.attributes?.name
    && agentLoopActive
    && effectsEnabled
    && isPlaying
    && !isDragging
    && !isSettingsOpen,
  );

  useEffect(() => {
    if (!shouldRun) {
      window.clearTimeout(timeoutRef.current);
      setEffects([]);
      return undefined;
    }

    let isActive = true;

    const scheduleNextPlan = (delaySeconds = 2) => {
      timeoutRef.current = window.setTimeout(() => {
        if (!isActive) return;

        const multimodalPlan = runMultimodalEffectWorkflow({
          actionId: actionState.id,
          activeSong,
          effectsEnabled,
          emotionId: emotionState.id,
          isDragging,
          isPlaying,
          isSettingsOpen,
          quietMode: emotionState.id === 'focused' || emotionState.id === 'calm',
        });
        const createdAt = Date.now();
        const plannedEffects = multimodalPlan.effectPlan.slice(0, 3).map((effect, index) => ({
          ...effect,
          effectType: getEffectClassName(effect.effectType),
          id: `${createdAt}-${effect.effectType}-${index}`,
        }));

        plannedEffects.forEach((effect) => {
          window.setTimeout(() => {
            if (!isActive) return;

            setEffects((currentEffects) => [
              ...currentEffects.slice(-(MAX_EFFECTS - 1)),
              effect,
            ]);

            window.setTimeout(() => {
              if (!isActive) return;
              setEffects((currentEffects) => currentEffects.filter((item) => item.id !== effect.id));
            }, effect.durationMs + 320);
          }, effect.delayMs);
        });

        scheduleNextPlan(multimodalPlan.cooldownSeconds);
      }, delaySeconds * 1000);
    };

    scheduleNextPlan(1.2);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutRef.current);
    };
  }, [actionState.id, activeSong, agentLoopActive, effectsEnabled, emotionState.id, isDragging, isPlaying, isSettingsOpen, shouldRun]);

  if (!effects.length) return null;

  return (
    <div className="multimodal-effect-layer" aria-hidden="true">
      {effects.map((effect) => (
        <span
          key={effect.id}
          className={[
            'multimodal-effect',
            `is-${effect.effectType}`,
            `at-${effect.position}`,
            `intensity-${effect.intensity}`,
          ].join(' ')}
          style={{
            animationDuration: `${effect.durationMs}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default MultimodalEffectLayer;
