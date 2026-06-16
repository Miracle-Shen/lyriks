export const runEmotionSelectionWorkflow = ({ input, memory, subAgents }) => {
  const result = subAgents.emotion.run('emotionSelection', input);

  memory.appendEvent({
    payload: result,
    type: 'emotion.selected',
  });

  return result;
};

