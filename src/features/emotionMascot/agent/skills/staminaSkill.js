export const staminaSkill = {
  description: 'Decide whether to suggest emotional continuation or transition.',
  name: 'stamina',
  run({ sessionMinutes = 0, sessionContext }) {
    const isSensitiveState = ['down', 'emo', 'lonely'].includes(sessionContext.emotion.id);
    const shouldSuggest = sessionMinutes >= (isSensitiveState ? 38 : 52);

    return {
      message: shouldSuggest
        ? '要不要我帮你把后面几首慢慢换得更治愈一点？'
        : null,
      requiresConfirmation: true,
      shouldSuggest,
      suggestionType: shouldSuggest ? 'gentleTransition' : 'none',
    };
  },
};

