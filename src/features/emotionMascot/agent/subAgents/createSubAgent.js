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
    const startedAt = Date.now();
    const taskID = input?.taskID ?? null;
    const logPrefix = `[Mascot][Agent:${name}]`;

    console.info(
      `${logPrefix} RUN skill=${skillName} taskID=${taskID ?? '-'}`
    );

    if (!skillNames.includes(skillName)) {
      console.error(
        `${logPrefix} DENY skill=${skillName} taskID=${taskID ?? '-'}`
      );
      throw new Error(`${name} cannot run skill: ${skillName}`);
    }

    try {
      const result = skillRegistry.run(skillName, input);
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
  skillNames,
  systemPrompt,
});
