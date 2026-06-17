import { getActionById } from '../../config/actionStates';
import { getEmotionById } from '../../config/emotionStates';
import { getTimeBand, getTodayKey } from '../utils/time';

const getSongContext = (activeSong) => {
  const attributes = activeSong?.attributes ?? {};

  return {
    artistName: attributes.artistName ?? '',
    genreNames: attributes.genreNames ?? [],
    hasSong: Boolean(attributes.name),
    title: attributes.name ?? '',
  };
};

export const buildMascotSessionContext = ({
  actionId,
  activeSong,
  effectsEnabled = true,
  emotionId,
  handoverDate,
  interactionMode = 'normal',
  isDragging = false,
  isPlaying = false,
  isSettingsOpen = false,
  page = 'discover',
  taskID = null,
  visualState = {},
} = {}) => {
  const emotion = getEmotionById(emotionId);
  const action = getActionById(actionId);
  const timeBand = getTimeBand();

  return {
    action,
    date: getTodayKey(),
    effectsEnabled,
    emotion,
    handoverDate,
    interactionMode,
    page,
    playback: {
      isPlaying,
      song: getSongContext(activeSong),
    },
    taskID,
    timeBand,
    ui: {
      isDragging,
      isSettingsOpen,
      visualState,
    },
  };
};
