export const runMultimodalEffectWorkflow = ({ input, subAgents }) => {
  const { sessionContext } = input;
  const canRun = Boolean(
    sessionContext.playback.song.hasSong
      && sessionContext.effectsEnabled
      && sessionContext.playback.isPlaying
      && !sessionContext.ui.isDragging
      && !sessionContext.ui.isSettingsOpen,
  );

  if (!canRun) {
    return {
      cooldownSeconds: 12,
      effectPlan: [],
      message: null,
      mode: 'disabled',
    };
  }

  return subAgents.multimodal.run('multimodalEffect', input);
};

