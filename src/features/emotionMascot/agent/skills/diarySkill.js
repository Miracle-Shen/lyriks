export const diarySkill = {
  description: 'Summarize listening events into a gentle mascot diary.',
  name: 'diary',
  run({ memorySummary, sessionContext }) {
    const latestEvents = memorySummary.recentEvents ?? [];

    return {
      emotionPath: latestEvents
        .map((event) => event.payload?.emotionId)
        .filter(Boolean)
        .slice(-4),
      representativeSongIds: latestEvents
        .map((event) => event.payload?.songId)
        .filter(Boolean)
        .slice(-3),
      summary: `你今天常停在${sessionContext.emotion.label}里，团子用${sessionContext.action.shortLabel}陪你听了一会儿。`,
      title: `今天的${sessionContext.emotion.label}听歌记录`,
    };
  },
};

