import { useEffect, useMemo, useState } from 'react';
import { HiOutlineRefresh, HiOutlineSparkles, HiOutlineX } from 'react-icons/hi';

import { runTodayHandoverWorkflow } from '../agent';
import { buildMascotChatEvent, startMascotAgentLoop } from '../agent/services/mascotChatClient';
import { actionStates, getActionById } from '../config/actionStates';
import { emotionStates, getEmotionById } from '../config/emotionStates';
import { useEmotionMascot } from '../context/EmotionMascotContext';

const getNextPlan = (currentPlan) => {
  const currentIndex = emotionStates.findIndex((emotion) => emotion.id === currentPlan.emotionId);
  const nextEmotion = emotionStates[(currentIndex + 1) % emotionStates.length];
  const nextAction = actionStates.find((action) => action.allowedEmotionIds.includes(nextEmotion.id))
    ?? actionStates[0];

  return {
    ...currentPlan,
    actionId: nextAction.id,
    emotionId: nextEmotion.id,
    message: `也可以换成${nextEmotion.label} · ${nextAction.shortLabel}。`,
    reason: '换一个状态看看今天更贴近哪一种听歌方式。',
  };
};

const AgentHandoverBubble = ({
  actionState,
  activeSong,
  effectsEnabled,
  emotionState,
  getSessionContext,
  isDiscoverPage,
  isPlaying,
  isSettingsOpen,
  onOpenSettings,
  setAgentTask,
  taskID,
}) => {
  const {
    actionId,
    applyAgentState,
    emotionId,
    handoverDate,
    markTodayHandover,
    todayKey,
  } = useEmotionMascot();
  const [isVisible, setIsVisible] = useState(false);
  const [plan, setPlan] = useState(() => ({
    actionId: actionState.id,
    emotionId: emotionState.id,
    message: '要不要让团子接管今天的听歌状态？',
    reason: '接管后才会启动 Agent loop，并根据你的选择持续流转。',
  }));
  const [isStarting, setIsStarting] = useState(false);
  const shouldShow = isDiscoverPage && !isSettingsOpen && handoverDate !== todayKey;

  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [actionId, emotionId, handoverDate, shouldShow]);

  const preview = useMemo(() => {
    if (!plan) {
      return {
        actionLabel: actionState.shortLabel,
        emotionLabel: emotionState.label,
      };
    }

    return {
      actionLabel: getActionById(plan.actionId).shortLabel,
      emotionLabel: getEmotionById(plan.emotionId).label,
    };
  }, [actionState.shortLabel, emotionState.label, plan]);

  if (!isVisible || !plan) return null;

  const startHandover = async ({
    openSettingsAfter = false,
    source = 'mascot_handover_accepted',
  } = {}) => {
    if (isStarting || taskID) return;

    setIsStarting(true);
    const baseHandoverPlan = runTodayHandoverWorkflow({
      actionId: plan.actionId,
      emotionId: plan.emotionId,
      handoverDate,
      page: 'discover',
    });
    const handoverPlan = {
      ...baseHandoverPlan,
      actionId: plan.actionId,
      emotionId: plan.emotionId,
      message: plan.message,
      reason: plan.reason,
    };

    try {
      const result = await startMascotAgentLoop(buildMascotChatEvent({
        activeSong,
        handoverPlan,
        option: {
          description: handoverPlan.reason,
          id: 'accepted',
          label: openSettingsAfter ? '接管后自选' : '接管',
        },
        playback: {
          isPlaying,
          song: activeSong?.attributes?.name ?? '',
        },
        sessionContext: getSessionContext({
          actionId: handoverPlan.actionId,
          emotionId: handoverPlan.emotionId,
          effectsEnabled,
        }),
        slot: 'handover',
        source,
        state: {
          actionId: handoverPlan.actionId,
          actionLabel: getActionById(handoverPlan.actionId).label,
          emotionId: handoverPlan.emotionId,
          emotionLabel: getEmotionById(handoverPlan.emotionId).label,
        },
        statePatch: {
          actionId: handoverPlan.actionId,
          emotionId: handoverPlan.emotionId,
        },
      }));

      applyAgentState(result.initialResult ?? handoverPlan);
      markTodayHandover('accepted');
      setAgentTask({
        agentReply: result.initialResult ?? handoverPlan,
        plan: result.plan,
        status: result.status ?? 'running',
        taskID: result.taskID,
      });
      setIsVisible(false);
      if (openSettingsAfter) onOpenSettings();
    } catch (error) {
      console.warn('Emotion mascot Agent loop failed to start', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAccept = (event) => {
    event.stopPropagation();
    startHandover();
  };

  const handleDismiss = (event) => {
    event.stopPropagation();
    markTodayHandover('dismissed');
    setIsVisible(false);
  };

  const handleShuffle = (event) => {
    event.stopPropagation();
    setPlan((currentPlan) => getNextPlan(currentPlan));
  };

  const handleOpenSettings = (event) => {
    event.stopPropagation();
    startHandover({
      openSettingsAfter: true,
      source: 'mascot_handover_customizing',
    });
  };

  return (
    <aside
      className="agent-handover-bubble"
      aria-label="今日情绪接管"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="agent-handover-close"
        aria-label="今天先不用"
        onClick={handleDismiss}
      >
        <HiOutlineX size={16} />
      </button>
      <p>{plan.message}</p>
      <strong>
        {preview.emotionLabel}
        {' · '}
        {preview.actionLabel}
      </strong>
      <span>{plan.reason}</span>
      <div className="agent-handover-actions">
        <button
          type="button"
          className="agent-handover-primary"
          disabled={isStarting}
          onClick={handleAccept}
        >
          <HiOutlineSparkles size={16} />
          {isStarting ? '启动中' : '接管'}
        </button>
        <button type="button" onClick={handleShuffle} aria-label="换一个状态">
          <HiOutlineRefresh size={16} />
        </button>
        <button type="button" onClick={handleOpenSettings}>
          自选
        </button>
      </div>
    </aside>
  );
};

export default AgentHandoverBubble;
