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
  emotionState,
  isDiscoverPage,
  isSettingsOpen,
  onOpenSettings,
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

  const handleAccept = (event) => {
    event.stopPropagation();
    const handoverPlan = runTodayHandoverWorkflow({
      actionId,
      emotionId,
      handoverDate,
      page: 'discover',
    });
    applyAgentState(handoverPlan);
    markTodayHandover('accepted');
    startMascotAgentLoop(buildMascotChatEvent({
      option: {
        description: handoverPlan.reason,
        id: 'accepted',
        label: '接管',
      },
      slot: 'handover',
      source: 'mascot_handover_accepted',
      state: {
        actionLabel: getActionById(handoverPlan.actionId).label,
        emotionLabel: getEmotionById(handoverPlan.emotionId).label,
      },
    })).catch((error) => {
      console.warn('Emotion mascot Agent loop failed to start', error);
    });
    setIsVisible(false);
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
    markTodayHandover('customizing');
    setIsVisible(false);
    onOpenSettings();
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
        <button type="button" className="agent-handover-primary" onClick={handleAccept}>
          <HiOutlineSparkles size={16} />
          接管
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
