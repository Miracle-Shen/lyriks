import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AudioPlayerContext = createContext({
  audioElement: null,
  setAudioElement: () => {},
});

export const AudioPlayerProvider = ({ children }) => {
  const [audioElement, setAudioElementState] = useState(null);

  const setAudioElement = useCallback((element) => {
    setAudioElementState(element ?? null);
  }, []);

  const value = useMemo(
    () => ({
      audioElement,
      setAudioElement,
    }),
    [audioElement, setAudioElement],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => useContext(AudioPlayerContext);
