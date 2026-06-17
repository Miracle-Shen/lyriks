import { mascotWorkflows } from '../constants';
import { buildMascotSessionContext } from '../context/buildMascotContext';
import { mascotMemory } from '../memory/mascotMemory';
import { createMascotSubAgents } from '../subAgents/createMascotSubAgents';
import { createSkillRegistry } from '../toolkit/skillRegistry';
import { diarySkill } from '../skills/diarySkill';
import { emotionSelectionSkill } from '../skills/emotionSelectionSkill';
import { multimodalEffectSkill } from '../skills/multimodalEffectSkill';
import { playlistSkill } from '../skills/playlistSkill';
import { socialSkill } from '../skills/socialSkill';
import { staminaSkill } from '../skills/staminaSkill';
import { taskPlanningSkill } from '../skills/taskPlanningSkill';
import { todayHandoverSkill } from '../skills/todayHandoverSkill';
import { webResearchSkill } from '../skills/webResearchSkill';
import { runChatWorkflow } from '../workflows/chatWorkflow';
import { runDiaryWorkflow } from '../workflows/diaryWorkflow';
import { runEmotionSelectionWorkflow } from '../workflows/emotionSelectionWorkflow';
import { runHandoverStartWorkflow } from '../workflows/handoverStartWorkflow';
import { runMoodHandoverWorkflow } from '../workflows/moodHandoverWorkflow';
import { runMultimodalEffectWorkflow } from '../workflows/multimodalEffectWorkflow';
import { runPlaylistWorkflow } from '../workflows/playlistWorkflow';
import { runSocialWorkflow } from '../workflows/socialWorkflow';
import { runStaminaWorkflow } from '../workflows/staminaWorkflow';
import { runWebResearchWorkflow } from '../workflows/webResearchWorkflow';

const createWorkflowRuntime = () => {
  const skillRegistry = createSkillRegistry([
    diarySkill,
    emotionSelectionSkill,
    multimodalEffectSkill,
    playlistSkill,
    socialSkill,
    staminaSkill,
    taskPlanningSkill,
    todayHandoverSkill,
    webResearchSkill,
  ]);
  const subAgents = createMascotSubAgents(skillRegistry);

  return {
    memory: mascotMemory,
    skillRegistry,
    subAgents,
  };
};

export const createEmotionMascotWorkforce = () => {
  const runtime = createWorkflowRuntime();

  return {
    describe() {
      return {
        agents: Object.values(runtime.subAgents).map((agent) => ({
          description: agent.description,
          name: agent.name,
          skills: agent.skillNames,
        })),
        skills: runtime.skillRegistry.list(),
        workflows: Object.values(mascotWorkflows),
      };
    },

    runWorkflow(workflowName, input = {}) {
      const sessionContext = input.sessionContext ?? buildMascotSessionContext(input);
      const workflowInput = {
        ...input,
        sessionContext,
      };
      const workflowArgs = {
        input: workflowInput,
        memory: runtime.memory,
        sessionContext,
        subAgents: runtime.subAgents,
      };

      switch (workflowName) {
        case mascotWorkflows.chat:
          return runChatWorkflow(workflowArgs);
        case mascotWorkflows.diary:
          return runDiaryWorkflow(workflowArgs);
        case mascotWorkflows.emotionSelection:
          return runEmotionSelectionWorkflow(workflowArgs);
        case mascotWorkflows.handoverStart:
          return runHandoverStartWorkflow(workflowArgs);
        case mascotWorkflows.moodHandover:
          return runMoodHandoverWorkflow(workflowArgs);
        case mascotWorkflows.multimodalEffect:
          return runMultimodalEffectWorkflow(workflowArgs);
        case mascotWorkflows.playlist:
          return runPlaylistWorkflow(workflowArgs);
        case mascotWorkflows.socialShare:
          return runSocialWorkflow(workflowArgs);
        case mascotWorkflows.stamina:
          return runStaminaWorkflow(workflowArgs);
        case mascotWorkflows.taskPlanning:
          return runtime.subAgents.task.run('taskPlanning', workflowInput);
        case mascotWorkflows.webResearch:
          return runWebResearchWorkflow(workflowArgs);
        default:
          throw new Error(`Unknown mascot workflow: ${workflowName}`);
      }
    },
  };
};
