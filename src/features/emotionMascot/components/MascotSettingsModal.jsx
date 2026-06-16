import { useEffect, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';

import ChoiceList from './ChoiceList';
import { mascotSettingTabs } from '../config/settingTabs';

const MascotSettingsModal = ({
  actionState,
  actionStates,
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
  effectsEnabled,
}) => {
  const [activeTabId, setActiveTabId] = useState(mascotSettingTabs[0].id);

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
        />
      );
    }

    if (activeTabId === 'action') {
      return (
        <ChoiceList
          items={actionStates}
          selectedId={actionState.id}
          onSelect={onActionChange}
          getDisabled={(action) => !availableActions.some((availableAction) => availableAction.id === action.id)}
        />
      );
    }

    if (activeTabId === 'skin') {
      return (
        <ChoiceList
          items={skinSuites}
          selectedId={skinSuite.id}
          onSelect={onSkinSuiteChange}
        />
      );
    }

    if (activeTabId === 'mascot') {
      return (
        <ChoiceList
          items={mascotVariants}
          selectedId={mascot.id}
          onSelect={onMascotChange}
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
            aria-pressed={effectsEnabled}
            onClick={() => onEffectsEnabledChange(!effectsEnabled)}
          >
            <span />
          </button>
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
