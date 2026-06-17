const fallbackSongIds = ['song_enter_1', 'song_hold_1', 'song_close_1'];

export const playlistSkill = {
  description: 'Create a staged emotional listening journey from candidate songs.',
  name: 'playlist',
  run({
    candidateSongs = [],
    sessionContext,
    targetEmotionId = null,
    taskID = sessionContext.taskID,
  }) {
    const songIds = candidateSongs.length
      ? candidateSongs.map((song) => song.id ?? song.key ?? song.attributes?.playParams?.id).filter(Boolean)
      : fallbackSongIds;
    const [first = songIds[0], second = songIds[0], third = songIds[0]] = songIds;
    const targetLabel = targetEmotionId ?? sessionContext.emotion.id;

    return {
      explanation: '这组歌会先承认当前状态，再慢慢把听感整理得更舒服。',
      journey: [
        {
          goal: '进入状态',
          songIds: songIds.slice(0, 3).length ? songIds.slice(0, 3) : [first],
          stage: '进入状态',
        },
        {
          goal: `维持 ${sessionContext.action.shortLabel} 的听感`,
          songIds: songIds.slice(3, 6).length ? songIds.slice(3, 6) : [second],
          stage: '保持氛围',
        },
        {
          goal: `向 ${targetLabel} 温柔收尾`,
          songIds: songIds.slice(6, 9).length ? songIds.slice(6, 9) : [third],
          stage: '温柔收尾',
        },
      ],
      playlistTitle: `${sessionContext.emotion.label} · ${sessionContext.action.shortLabel}`,
      taskID,
    };
  },
};
