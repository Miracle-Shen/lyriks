import { actionStates } from '../../config/actionStates';
import { emotionStates } from '../../config/emotionStates';

const keywordMap = [
  { actionId: 'fitness', emotionId: 'energetic', keywords: ['运动', '跑步', '健身', '带劲', '高能'] },
  { actionId: 'sleeping', emotionId: 'calm', keywords: ['睡', '助眠', '安静', '平静'] },
  { actionId: 'beachRelax', emotionId: 'relaxed', keywords: ['放松', '海边', 'chill', '松弛'] },
  { actionId: 'midnightEmo', emotionId: 'emo', keywords: ['emo', '难过', '丧', '低落', '孤独'] },
  { actionId: 'commuting', emotionId: 'focused', keywords: ['专注', '工作', '学习', '通勤'] },
  { actionId: 'traveling', emotionId: 'healing', keywords: ['旅行', '路上', '城市', '散步'] },
];

export const emotionSelectionSkill = {
  description: 'Map user text or click intent to emotion/action state.',
  name: 'emotionSelection',
  run({ text = '' }) {
    const normalizedText = text.toLowerCase();
    const matched = keywordMap.find((item) => item.keywords.some((keyword) => normalizedText.includes(keyword)));

    if (matched) {
      return {
        actionId: matched.actionId,
        clarifyingQuestion: null,
        confidence: 0.82,
        emotionId: matched.emotionId,
      };
    }

    return {
      actionId: actionStates[0].id,
      clarifyingQuestion: '你更想安静放松，还是想被稍微带起来一点？',
      confidence: 0.36,
      emotionId: emotionStates[0].id,
    };
  },
};

