import {
  mascotWorkflows,
  runMascotWorkflow,
  runMultimodalEffectWorkflow,
  runTodayHandoverWorkflow,
} from './index';

export const createTodayHandoverPlan = (input = {}) => (
  runTodayHandoverWorkflow(input)
);

export const createMultimodalEffectPlan = (input = {}) => (
  runMultimodalEffectWorkflow(input)
);

export const createEmotionPlaylistPlan = (input = {}) => (
  runMascotWorkflow(mascotWorkflows.playlist, input)
);

export const createEmotionDiary = (input = {}) => (
  runMascotWorkflow(mascotWorkflows.diary, input)
);

