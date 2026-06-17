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
      const startedAt = Date.now();
      const taskID = input?.taskID ?? null;
      const logPrefix = '[Mascot][SkillRegistry]';
      console.info(
        `${logPrefix} RUN skill=${skillName} taskID=${taskID ?? '-'}`
      );

      try {
        const result = this.get(skillName).run(input);
        if (result && typeof result.then === 'function') {
          return result.then((resolved) => {
            console.info(
              `${logPrefix} OK skill=${skillName} taskID=${taskID ?? '-'} durationMs=${Date.now() - startedAt}`
            );
            return resolved;
          }).catch((error) => {
            console.error(
              `${logPrefix} ERR skill=${skillName} taskID=${taskID ?? '-'} durationMs=${Date.now() - startedAt}`,
              error
            );
            throw error;
          });
        }

        console.info(
          `${logPrefix} OK skill=${skillName} taskID=${taskID ?? '-'} durationMs=${Date.now() - startedAt}`
        );
        return result;
      } catch (error) {
        console.error(
          `${logPrefix} ERR skill=${skillName} taskID=${taskID ?? '-'} durationMs=${Date.now() - startedAt}`,
          error
        );
        throw error;
      }
    },
  };
};
