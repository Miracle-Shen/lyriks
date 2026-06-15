import { useEffect, useRef, useState } from 'react';

import { createSpectrumLogState, readAudioBeat } from '../utils/audioBeat';
import { clamp } from '../utils/math';

export const useBeatMotion = ({
  audioElement,
  enabled,
  isPlaying,
  motionProfile,
}) => {
  const [motion, setMotion] = useState({
    bounce: 0.12,
    glow: 0.18,
    tilt: 0,
  });
  const smoothedBeatRef = useRef(0.12);
  const spectrumLogRef = useRef(createSpectrumLogState());

  useEffect(() => {
    spectrumLogRef.current = createSpectrumLogState();
  }, [audioElement]);

  useEffect(() => {
    if (!enabled) return undefined;

    let animationFrameId = 0;

    const updateMotion = () => {
      const audioBeat = readAudioBeat({
        audioElement,
        isPlaying,
        logState: spectrumLogRef.current,
      });
      const now = audioBeat.now;
      const idleBeat = 0.1 + Math.abs(Math.sin(now / motionProfile.idleSpeed)) * motionProfile.idleAmount;
      const nextBeat = audioBeat.beat ?? idleBeat;
      const profiledBeat = clamp(
        (nextBeat * motionProfile.beatMultiplier) + motionProfile.beatOffset,
        0.08,
        1,
      );

      smoothedBeatRef.current = (
        smoothedBeatRef.current * (1 - motionProfile.response)
      ) + (profiledBeat * motionProfile.response);

      setMotion({
        bounce: smoothedBeatRef.current,
        glow: clamp(smoothedBeatRef.current * 0.95, 0.12, 0.95),
        tilt: isPlaying
          ? (smoothedBeatRef.current - 0.32) * motionProfile.tiltScale
          : Math.sin(now / motionProfile.idleSpeed) * 2,
      });

      animationFrameId = window.requestAnimationFrame(updateMotion);
    };

    animationFrameId = window.requestAnimationFrame(updateMotion);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [audioElement, enabled, isPlaying, motionProfile]);

  return motion;
};

