import { getAvailableActions } from '../../config/actionStates';

const recommendationByTimeBand = {
  afternoon: {
    actionId: 'commuting',
    emotionId: 'focused',
    message: '下午我猜你可能需要稳一点，要进入专注通勤感吗？',
    reason: '下午时段更适合稳定节奏和低干扰陪伴。',
  },
  evening: {
    actionId: 'beachRelax',
    emotionId: 'relaxed',
    message: '今天要不要让我用海边放松陪你听一会儿？',
    reason: '晚上适合把节奏慢慢放下来。',
  },
  lateNight: {
    actionId: 'midnightEmo',
    emotionId: 'emo',
    message: '夜里我可以安静一点陪你，要进入深夜 EMO 吗？',
    reason: '深夜更适合低亮度、慢节奏的陪听方式。',
  },
  morning: {
    actionId: 'commuting',
    emotionId: 'energetic',
    message: '早上要不要让我用元气通勤陪你开场？',
    reason: '上午更适合轻轻唤醒和进入节奏。',
  },
};

const ensureAction = (emotionId, actionId) => (
  getAvailableActions(emotionId).some((action) => action.id === actionId)
    ? actionId
    : getAvailableActions(emotionId)[0]?.id
);

export const todayHandoverSkill = {
  description: 'Generate today mood handover recommendation and bubble copy.',
  name: 'todayHandover',
  run({ sessionContext }) {
    const basePlan = recommendationByTimeBand[sessionContext.timeBand]
      ?? recommendationByTimeBand.evening;

    return {
      actionId: ensureAction(basePlan.emotionId, basePlan.actionId),
      emotionId: basePlan.emotionId,
      message: basePlan.message,
      reason: basePlan.reason,
      shouldPrompt: sessionContext.handoverDate !== sessionContext.date,
      sourceAgent: 'emotion_mascot_coordinator',
      timeBand: sessionContext.timeBand,
    };
  },
};

