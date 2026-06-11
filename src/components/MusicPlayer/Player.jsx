/* eslint-disable jsx-a11y/media-has-caption */
import { useRef, useEffect } from 'react';

import { useAudioPlayer } from '../../contexts/AudioPlayerContext';

const Player = ({ activeSong, isPlaying, volume, seekTime, onEnded, onTimeUpdate, onLoadedData, repeat }) => {
  const ref = useRef(null);
  const { setAudioElement } = useAudioPlayer();
  // eslint-disable-next-line no-unused-expressions
  if (ref.current) {
    if (isPlaying) {
      ref.current.play();
    } else {
      ref.current.pause();
    }
  }

  useEffect(() => {
    ref.current.volume = volume;
  }, [volume]);
  // updates audio element only on seekTime change (and not on each rerender):
  useEffect(() => {
    ref.current.currentTime = seekTime;
  }, [seekTime]);

  useEffect(() => {
    setAudioElement(ref.current);

    return () => {
      setAudioElement(null);
    };
  }, [setAudioElement]);

  return (
    <audio
      src={activeSong?.attributes?.previews?.[0]?.url}
      ref={ref}
      crossOrigin="anonymous"
      loop={repeat}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      onLoadedData={onLoadedData}
    />
  );
};

export default Player;
