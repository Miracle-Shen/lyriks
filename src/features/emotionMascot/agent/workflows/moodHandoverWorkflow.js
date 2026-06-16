export const runMoodHandoverWorkflow = ({ memory, sessionContext, subAgents }) => {
  const plan = subAgents.coordinator.run('todayHandover', { sessionContext });

  memory.appendEvent({
    payload: {
      actionId: plan.actionId,
      emotionId: plan.emotionId,
      shouldPrompt: plan.shouldPrompt,
    },
    type: 'handover.planned',
  });

  return plan;
};

