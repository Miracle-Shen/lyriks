const actionEffectPools = {
  beachRelax: ['wave', 'sunDot', 'softWind'],
  commuting: ['cityLight', 'rhythmDot', 'motionLine'],
  fitness: ['energySpark', 'motionLine', 'rhythmDot'],
  midnightEmo: ['rainDrop', 'dimGlow', 'lowWave'],
  sleeping: ['moonDot', 'star', 'breathRing'],
  traveling: ['mapPin', 'cameraFlash', 'routeLine'],
};

const emotionEffectPools = {
  calm: ['breathRing', 'moonDot'],
  down: ['dimGlow', 'rainDrop'],
  emo: ['rainDrop', 'lowWave'],
  energetic: ['energySpark', 'rhythmDot'],
  focused: ['rhythmDot', 'cityLight'],
  happy: ['sunDot', 'energySpark'],
  healing: ['softWind', 'star'],
  lonely: ['dimGlow', 'star'],
  relaxed: ['wave', 'softWind'],
  romantic: ['heartGlow', 'sunDot'],
};

const positions = ['top', 'right', 'bottom-left', 'top-right', 'left'];

const getAudioSummary = (activeSong, isPlaying) => {
  const title = activeSong?.attributes?.name ?? '';
  const artist = activeSong?.attributes?.artistName ?? '';
  const seed = `${title}${artist}`.length;
  const energy = isPlaying ? 0.42 + ((seed % 7) * 0.08) : 0;
  const structure = seed % 5 === 0
    ? 'chorus'
    : seed % 3 === 0
      ? 'verse'
      : 'ambient';

  return {
    energy: Math.min(0.96, energy),
    lyricMood: seed % 2 === 0 ? 'soft' : 'bright',
    structure,
    title,
  };
};

export const multimodalEffectSkill = {
  description: 'Generate structured effectPlan from audio, lyric, state and UI context.',
  name: 'multimodalEffect',
  run({
    activeSong,
    quietMode = false,
    sessionContext,
  }) {
    const audioSummary = getAudioSummary(activeSong, sessionContext.playback.isPlaying);
    const actionPool = actionEffectPools[sessionContext.action.id] ?? [];
    const emotionPool = emotionEffectPools[sessionContext.emotion.id] ?? [];
    const effectPool = [...new Set([...actionPool, ...emotionPool, 'breathRing'])];
    const effectCount = quietMode ? 1 : Math.max(1, Math.min(3, Math.round(audioSummary.energy * 3)));
    const durationBase = quietMode ? 1400 : 1500 + Math.round(audioSummary.energy * 900);

    return {
      audioSummary,
      cooldownSeconds: quietMode ? 16 : 7 + Math.round((1 - audioSummary.energy) * 8),
      effectPlan: Array.from({ length: effectCount }).map((_, index) => ({
        delayMs: index * 260,
        durationMs: durationBase + (index * 160),
        effectType: effectPool[index % effectPool.length],
        intensity: quietMode || audioSummary.energy < 0.6 ? 'low' : 'medium',
        position: positions[(index + `${sessionContext.action.id}${sessionContext.emotion.id}`.length) % positions.length],
      })),
      message: null,
      mode: 'visualEffect',
      sourceAgent: 'multimodal_listening_effect_agent',
    };
  },
};

