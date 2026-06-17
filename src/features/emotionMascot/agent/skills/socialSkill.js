export const socialSkill = {
  description: 'Turn a song into a mascot-style social expression.',
  name: 'socialShare',
  run({ sessionContext, songId, taskID = sessionContext.taskID }) {
    return {
      mascotPayload: {
        actionId: sessionContext.action.id,
        emotionId: sessionContext.emotion.id,
        songId,
      },
      shareMessage: `我的团子带来一首适合${sessionContext.action.shortLabel}里的歌。`,
      taskID,
    };
  },
};
