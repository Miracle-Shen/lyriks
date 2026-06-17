export const runChatWorkflow = ({
  input,
  memory,
  sessionContext,
  subAgents,
}) => {
  const statePatch = input.statePatch ?? {};
  const text = input.userText
    ?? input.option?.label
    ?? input.option?.description
    ?? '';
  const emotionResult = statePatch.emotionId || text
    ? subAgents.emotion.run('emotionSelection', {
      text,
    })
    : null;
  const multimodalResult = subAgents.multimodal.run('multimodalEffect', {
    activeSong: input.activeSong,
    quietMode: statePatch.interactionMode === 'quiet' || !sessionContext.effectsEnabled,
    sessionContext,
  });
  const staminaResult = subAgents.stamina.run('stamina', {
    sessionContext,
    sessionMinutes: input.sessionMinutes ?? 0,
  });

  const reply = {
    actionId: statePatch.actionId ?? emotionResult?.actionId ?? sessionContext.action.id,
    emotionId: statePatch.emotionId ?? emotionResult?.emotionId ?? sessionContext.emotion.id,
    interactionMode: statePatch.interactionMode ?? sessionContext.interactionMode,
    message: input.messageType === 'mascot_state_change'
      ? '已在同一个任务里继续调整团子状态。'
      : '团子已经收到，会继续按当前任务陪你听。',
    skinSuiteId: statePatch.skinSuiteId,
  };

  const result = {
    effects: {
      durationMs: multimodalResult.effectPlan?.[0]?.durationMs ?? 1800,
      intensity: multimodalResult.effectPlan?.[0]?.intensity ?? 'low',
    },
    reply,
    sourceAgent: 'emotion_mascot_coordinator',
    status: 'running',
    taskID: input.taskID,
  };

  memory.appendEvent({
    payload: {
      reply,
      taskID: input.taskID,
    },
    type: 'task.chat',
  });

  if (staminaResult.shouldSuggest) {
    memory.appendEvent({
      payload: staminaResult,
      type: 'stamina.suggested',
    });
  }

  return result;
};
