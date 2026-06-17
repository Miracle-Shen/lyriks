import { mascotAgentRoles } from '../constants';
import { createSubAgent } from './createSubAgent';

export const createMascotSubAgents = (skillRegistry) => ({
  browser: createSubAgent({
    description: 'Runs web research and Playwright-backed search only.',
    name: mascotAgentRoles.browser,
    skillNames: ['webSearch'],
    skillRegistry,
    systemPrompt: '只负责联网搜索和网页信息采集，不做情绪判断，不直接改变播放或团子状态。',
  }),
  coordinator: createSubAgent({
    description: 'Main mascot coordinator. Routes user/page events to specialist agents.',
    name: mascotAgentRoles.coordinator,
    skillNames: ['todayHandover'],
    skillRegistry,
    systemPrompt: '主动但克制，所有重要动作都需要用户确认。',
  }),
  diary: createSubAgent({
    description: 'Summarizes music emotion records.',
    name: mascotAgentRoles.diary,
    skillNames: ['diary'],
    skillRegistry,
    systemPrompt: '只总结听歌状态，不做心理诊断。',
  }),
  emotion: createSubAgent({
    description: 'Understands user mood and maps it to mascot states.',
    name: mascotAgentRoles.emotion,
    skillNames: ['emotionSelection'],
    skillRegistry,
    systemPrompt: '把模糊表达映射为一级情绪和二级动作状态。',
  }),
  multimodal: createSubAgent({
    description: 'Creates short-lived visual effect plans around the mascot.',
    name: mascotAgentRoles.multimodal,
    skillNames: ['multimodalEffect'],
    skillRegistry,
    systemPrompt: '综合音频、歌词摘要、播放阶段和 UI 状态，只输出结构化特效计划。',
  }),
  music: createSubAgent({
    description: 'Builds staged emotional playlists.',
    name: mascotAgentRoles.music,
    skillNames: ['playlist'],
    skillRegistry,
    systemPrompt: '组织一段有起承转合的听歌旅程。',
  }),
  social: createSubAgent({
    description: 'Turns music sharing into mascot-style social expression.',
    name: mascotAgentRoles.social,
    skillNames: ['socialShare'],
    skillRegistry,
    systemPrompt: '分享前需要用户确认，不推断好友隐私。',
  }),
  stamina: createSubAgent({
    description: 'Decides whether to continue, transition, or gently close a state.',
    name: mascotAgentRoles.stamina,
    skillNames: ['stamina'],
    skillRegistry,
    systemPrompt: '对低落/EMO/孤独保持克制，转场必须确认。',
  }),
  task: createSubAgent({
    description: 'Creates taskID-scoped task and todo lists after handover.',
    name: mascotAgentRoles.task,
    skillNames: ['taskPlanning'],
    skillRegistry,
    systemPrompt: '用户确认接管后才生成 taskID 范围内的任务计划；不直接执行任务。',
  }),
});
