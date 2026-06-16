# 情绪团子 Agent 架构

本目录参考 `app` 中的 Agent 调度模式，把情绪团子拆成前端可执行的轻量 workforce。

## 目录职责

- `constants.js`：Agent 角色、workflow 名称、交互枚举。
- `context/`：把页面、播放、情绪、动作、UI 状态整理成模型上下文。
- `memory/`：本地 Agent 记忆摘要，保留轻量事件，不做心理诊断。
- `toolkit/`：Skill 注册和调用入口。
- `skills/`：确定性能力模块，包括今日接管、情绪选择、歌单、续航、日记、社交、多模态特效。
- `subAgents/`：专职子 Agent，限制每个 Agent 可调用的 Skill。
- `workflows/`：把用户事件、上下文、子 Agent 和结果串成可执行流程。
- `workforce/`：主调度器，类似 app 里的 workforce construction。

## 调用方式

```js
import { mascotWorkflows, runMascotWorkflow } from '../agent';

const plan = runMascotWorkflow(mascotWorkflows.moodHandover, {
  actionId,
  emotionId,
  handoverDate,
  page: 'discover',
});
```

## 当前子 Agent

- `emotion_mascot_coordinator`：今日情绪接管与主调度。
- `emotion_understanding_agent`：自然语言到情绪/动作状态。
- `music_recommendation_agent`：情绪歌单旅程。
- `multimodal_listening_effect_agent`：多模态陪听特效计划。
- `emotion_stamina_agent`：情绪续航和温和转场。
- `emotion_diary_agent`：团子日记。
- `social_mascot_agent`：团子式音乐分享。

