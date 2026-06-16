import { mascotWorkflows } from './constants';
import { createEmotionMascotWorkforce } from './workforce/createEmotionMascotWorkforce';

export { buildMascotSessionContext } from './context/buildMascotContext';
export { mascotWorkflows } from './constants';
export { createEmotionMascotWorkforce } from './workforce/createEmotionMascotWorkforce';

export const emotionMascotWorkforce = createEmotionMascotWorkforce();

export const runMascotWorkflow = (workflowName, input) => (
  emotionMascotWorkforce.runWorkflow(workflowName, input)
);

export const runTodayHandoverWorkflow = (input) => (
  runMascotWorkflow(mascotWorkflows.moodHandover, input)
);

export const runMultimodalEffectWorkflow = (input) => (
  runMascotWorkflow(mascotWorkflows.multimodalEffect, input)
);

