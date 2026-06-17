export const runWebResearchWorkflow = ({ input, sessionContext, subAgents }) => (
  subAgents.browser.run('webSearch', {
    query: input.query,
    sessionContext,
    taskID: input.taskID,
  })
);
