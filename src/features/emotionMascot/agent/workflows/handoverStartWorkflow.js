export const runHandoverStartWorkflow = ({
  input,
  memory,
  sessionContext,
  subAgents,
}) => {
  const handoverPlan = input.handoverPlan
    ?? subAgents.coordinator.run('todayHandover', { sessionContext });
  const taskPlan = subAgents.task.run('taskPlanning', {
    handoverPlan,
    sessionContext,
    taskID: input.taskID,
    userIntent: input.userIntent,
  });

  memory.appendEvent({
    payload: {
      actionId: handoverPlan.actionId,
      emotionId: handoverPlan.emotionId,
      taskID: input.taskID,
    },
    type: 'handover.accepted',
  });
  memory.appendEvent({
    payload: taskPlan,
    type: 'task.created',
  });

  return {
    initialResult: handoverPlan,
    plan: taskPlan,
    sseUrl: `/api/mascot/events?taskID=${input.taskID}`,
    status: 'running',
    taskID: input.taskID,
  };
};
