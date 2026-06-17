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

const createTraceId = () => (
  `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

const pickContext = (workflowName, input, sessionContext) => {
  const actionId = input?.actionId ?? sessionContext?.action?.id ?? null;
  const emotionId = input?.emotionId ?? sessionContext?.emotion?.id ?? null;
  const page = input?.page ?? sessionContext?.page ?? null;
  const taskID = input?.taskID ?? null;
  const userText = typeof input?.userText === 'string' ? input.userText : null;
  const optionLabel = input?.option?.label ?? null;
  const activeSongId = input?.activeSong?.key ?? input?.activeSong?.id ?? null;

  return {
    actionId,
    activeSongId,
    emotionId,
    optionLabel,
    page,
    taskID,
    userText: userText ? userText.slice(0, 120) : null,
    workflowName,
  };
};

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
      const traceId = createTraceId();
      const startedAt = Date.now();
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

      const logPrefix = `[Mascot][WF:${workflowName}]`;
      const ctx = pickContext(workflowName, workflowInput, sessionContext);
      console.info(`${logPrefix} START trace=${traceId}`, ctx);

      try {
        let result;
        switch (workflowName) {
          case mascotWorkflows.chat:
            result = runChatWorkflow(workflowArgs);
            break;
          case mascotWorkflows.diary:
            result = runDiaryWorkflow(workflowArgs);
            break;
          case mascotWorkflows.emotionSelection:
            result = runEmotionSelectionWorkflow(workflowArgs);
            break;
          case mascotWorkflows.handoverStart:
            result = runHandoverStartWorkflow(workflowArgs);
            break;
          case mascotWorkflows.moodHandover:
            result = runMoodHandoverWorkflow(workflowArgs);
            break;
          case mascotWorkflows.multimodalEffect:
            result = runMultimodalEffectWorkflow(workflowArgs);
            break;
          case mascotWorkflows.playlist:
            result = runPlaylistWorkflow(workflowArgs);
            break;
          case mascotWorkflows.socialShare:
            result = runSocialWorkflow(workflowArgs);
            break;
          case mascotWorkflows.stamina:
            result = runStaminaWorkflow(workflowArgs);
            break;
          case mascotWorkflows.taskPlanning:
            result = runtime.subAgents.task.run('taskPlanning', workflowInput);
            break;
          case mascotWorkflows.webResearch:
            result = runWebResearchWorkflow(workflowArgs);
            break;
          default:
            throw new Error(`Unknown mascot workflow: ${workflowName}`);
        }

        if (result && typeof result.then === 'function') {
          return result.then((resolved) => {
            console.info(
              `${logPrefix} OK trace=${traceId} durationMs=${Date.now() - startedAt}`
            );
            return resolved;
          }).catch((error) => {
            console.error(
              `${logPrefix} ERR trace=${traceId} durationMs=${Date.now() - startedAt}`,
              error
            );
            throw error;
          });
        }

        console.info(
          `${logPrefix} OK trace=${traceId} durationMs=${Date.now() - startedAt}`
        );
        return result;
      } catch (error) {
        console.error(
          `${logPrefix} ERR trace=${traceId} durationMs=${Date.now() - startedAt}`,
          error
        );
        throw error;
      }
    },
  };
};
