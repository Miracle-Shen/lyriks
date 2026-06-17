export const webResearchSkill = {
  description: 'Return structured web research hints. Browser Agent only gathers information.',
  name: 'webSearch',
  run({
    query,
    sessionContext,
    taskID,
  }) {
    const stateLabel = `${sessionContext.emotion.label} ${sessionContext.action.shortLabel}`;
    const searchQuery = query || `${stateLabel} 音乐 歌单 推荐`;

    return {
      agent: 'browser_agent',
      confidence: 0.64,
      query: searchQuery,
      retrievedAt: new Date().toISOString(),
      sources: [
        {
          summary: `可围绕「${stateLabel}」寻找低打扰、状态匹配、可解释的歌曲线索。`,
          title: `${stateLabel} 听歌线索`,
          url: 'local://emotion-mascot/browser-agent/search-summary',
        },
      ],
      summary: '当前为本地 Browser Agent 兜底摘要；接入后端后可由 Playwright 联网搜索替换。',
      taskID,
    };
  },
};
