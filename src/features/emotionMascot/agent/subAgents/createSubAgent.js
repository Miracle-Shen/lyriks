export const createSubAgent = ({
  description,
  name,
  skillNames,
  skillRegistry,
  systemPrompt,
}) => ({
  description,
  name,
  run(skillName, input) {
    if (!skillNames.includes(skillName)) {
      throw new Error(`${name} cannot run skill: ${skillName}`);
    }

    return skillRegistry.run(skillName, input);
  },
  skillNames,
  systemPrompt,
});

