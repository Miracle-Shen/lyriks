export const createSkillRegistry = (skills) => {
  const skillMap = new Map(skills.map((skill) => [skill.name, skill]));

  return {
    get(skillName) {
      const skill = skillMap.get(skillName);
      if (!skill) {
        throw new Error(`Unknown mascot skill: ${skillName}`);
      }
      return skill;
    },

    list() {
      return [...skillMap.values()].map(({ description, name }) => ({ description, name }));
    },

    run(skillName, input) {
      return this.get(skillName).run(input);
    },
  };
};

