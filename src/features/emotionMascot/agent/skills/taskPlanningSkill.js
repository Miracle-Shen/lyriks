const createSubTask = ({
  agent,
  dependsOn = [],
  priority,
  title,
  toolkit,
}, index) => ({
  agent,
  dependsOn,
  priority,
  status: 'planned',
  subTaskId: `subtask_${String(index + 1).padStart(3, '0')}`,
  title,
  toolkit,
});

export const taskPlanningSkill = {
  description: 'Create taskID-scoped task and todo list after handover is accepted.',
  name: 'taskPlanning',
  run({
    handoverPlan = {},
    sessionContext,
    taskID,
    userIntent = '',
  }) {
    const emotionLabel = sessionContext.emotion.label;
    const actionLabel = sessionContext.action.shortLabel;
    const hasSong = sessionContext.playback.song.hasSong;
    const stateLabel = `${emotionLabel} · ${actionLabel}`;

    const searchTask = createSubTask({
      agent: 'browser_agent',
      priority: 1,
      title: `搜索适合「${stateLabel}」的听歌线索`,
      toolkit: 'webSearch',
    }, 0);
    const playlistTask = createSubTask({
      agent: 'music_recommendation_agent',
      dependsOn: [searchTask.subTaskId],
      priority: 2,
      title: `生成「${stateLabel}」三阶段歌单旅程`,
      toolkit: 'playlist',
    }, 1);
    const effectTask = createSubTask({
      agent: 'multimodal_listening_effect_agent',
      priority: hasSong ? 2 : 3,
      title: hasSong ? '生成当前歌曲陪听特效' : '准备低打扰团子陪伴反馈',
      toolkit: 'multimodalEffect',
    }, 2);
    const staminaTask = createSubTask({
      agent: 'emotion_stamina_agent',
      priority: 3,
      title: '规划温和续航与状态转场策略',
      toolkit: 'stamina',
    }, 3);

    return {
      confirmedState: {
        actionId: handoverPlan.actionId ?? sessionContext.action.id,
        emotionId: handoverPlan.emotionId ?? sessionContext.emotion.id,
      },
      createdAt: new Date().toISOString(),
      humanInteraction: 'handover_accepted',
      planId: `plan_${taskID}`,
      summary: userIntent
        ? `已根据「${userIntent}」为团子整理任务。`
        : `已为「${stateLabel}」整理接管任务。`,
      taskID,
      tasks: [searchTask, playlistTask, effectTask, staminaTask],
    };
  },
};
