export const runSocialWorkflow = ({ input, subAgents }) => (
  subAgents.social.run('socialShare', input)
);

