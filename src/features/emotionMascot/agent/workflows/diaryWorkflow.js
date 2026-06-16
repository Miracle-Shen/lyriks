export const runDiaryWorkflow = ({ input, memory, subAgents }) => (
  subAgents.diary.run('diary', {
    ...input,
    memorySummary: memory.getSummary(),
  })
);

