import { useEffect, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';

import ChoiceList from './ChoiceList';
import { mascotSettingTabs } from '../config/settingTabs';

const MascotSettingsModal = ({
  actionState,
  actionStates,
  agentReply,
  availableActions,
  emotionState,
  emotionStates,
  mascot,
  mascotVariants,
  onActionChange,
  onClose,
  onEmotionChange,
  onMascotChange,
  onEffectsEnabledChange,
  onSkinSuiteChange,
  skinSuite,
  skinSuites,
  taskID,
  taskPlan,
  taskStatus,
  effectsEnabled,
}) => {
  const [activeTabId, setActiveTabId] = useState(mascotSettingTabs[0].id);
  const isTaskActive = Boolean(taskID);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const renderTabPanel = () => {
    if (activeTabId === 'emotion') {
      return (
        <ChoiceList
          items={emotionStates}
          selectedId={emotionState.id}
          onSelect={onEmotionChange}
          getDisabled={() => !isTaskActive}
        />
      );
    }

    if (activeTabId === 'action') {
      return (
        <ChoiceList
          items={actionStates}
          selectedId={actionState.id}
          onSelect={onActionChange}
          getDisabled={(action) => (
            !isTaskActive
            || !availableActions.some((availableAction) => availableAction.id === action.id)
          )}
        />
      );
    }

    if (activeTabId === 'skin') {
      return (
        <ChoiceList
          items={skinSuites}
          selectedId={skinSuite.id}
          onSelect={onSkinSuiteChange}
          getDisabled={() => !isTaskActive}
        />
      );
    }

    if (activeTabId === 'mascot') {
      return (
        <ChoiceList
          items={mascotVariants}
          selectedId={mascot.id}
          onSelect={onMascotChange}
          getDisabled={(item) => !isTaskActive && item.id !== 'hidden'}
        />
      );
    }

    return null;
  };

  return (
    <div
      className="emotion-mascot-modal-overlay"
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={onClose}
    >
      <section
        className="emotion-mascot-modal"
        role="dialog"
        aria-modal="true"
        aria-label="情绪团子设置"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="emotion-mascot-modal-header">
          <div>
            <p className="emotion-mascot-modal-eyebrow">{mascot.label}</p>
            <h2 className="emotion-mascot-modal-title">
              {emotionState.label}
              {' · '}
              {actionState.label}
            </h2>
          </div>
          <button
            type="button"
            className="emotion-mascot-close-button"
            aria-label="关闭"
            onClick={onClose}
          >
            <HiOutlineX size={22} />
          </button>
        </header>

        <div className="emotion-mascot-agent-row">
          <div>
            <strong>多模态陪听特效</strong>
            <span>播放时在团子附近生成短暂情绪反馈</span>
          </div>
          <button
            type="button"
            className={`emotion-mascot-switch ${effectsEnabled ? 'is-on' : ''}`}
            disabled={!isTaskActive}
            aria-pressed={effectsEnabled}
            onClick={() => onEffectsEnabledChange(!effectsEnabled)}
          >
            <span />
          </button>
        </div>

        <div className="emotion-mascot-task-row">
          <div>
            <strong>{taskID ? `Task ${taskID}` : '尚未接管'}</strong>
            <span>
              {taskID
                ? `Workforce ${taskStatus || 'running'} · ${taskPlan?.tasks?.length ?? 0} 个子任务`
                : '接受接管后才会启动 Agent 并生成 taskID'}
            </span>
          </div>
          {agentReply?.message || agentReply?.reason ? (
            <p>{agentReply.message || agentReply.reason}</p>
          ) : null}
        </div>

        <div className="emotion-mascot-tabs" role="tablist" aria-label="情绪团子设置分类">
          {mascotSettingTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`emotion-mascot-tab ${activeTabId === tab.id ? 'is-active' : ''}`}
              role="tab"
              aria-selected={activeTabId === tab.id}
              onClick={() => setActiveTabId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="emotion-mascot-tab-panel" role="tabpanel">
          {renderTabPanel()}
        </div>
      </section>
    </div>
  );
};

export default MascotSettingsModal;
