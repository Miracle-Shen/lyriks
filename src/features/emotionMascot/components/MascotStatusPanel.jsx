const MascotStatusPanel = ({
  actionState,
  availableActions,
  emotionState,
  emotionStates,
  mascot,
  onActionChange,
  onEmotionChange,
  onMascotChange,
  songMeta,
}) => (
  <div className="mt-1 w-48 rounded-lg border border-white/15 bg-slate-950/70 p-2 text-center text-[10px] leading-4 text-white/90 shadow-2xl backdrop-blur-md">
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        className="beat-mascot-cycle-button"
        onClick={onMascotChange}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {mascot.label}
      </button>
      <span className="max-w-[74px] truncate text-white/45">{mascot.description}</span>
    </div>
    <p className="mt-1 truncate font-semibold">{songMeta.title}</p>
    <p className="truncate text-white/65">{songMeta.artist}</p>

    <label className="mt-2 block text-left text-[9px] uppercase tracking-[0.18em] text-white/45" htmlFor="emotion-mascot-emotion">
      情绪
    </label>
    <select
      id="emotion-mascot-emotion"
      className="beat-mascot-select"
      value={emotionState.id}
      onChange={(event) => onEmotionChange(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {emotionStates.map((emotion) => (
        <option key={emotion.id} value={emotion.id}>
          {emotion.label}
        </option>
      ))}
    </select>

    <label className="mt-1.5 block text-left text-[9px] uppercase tracking-[0.18em] text-white/45" htmlFor="emotion-mascot-action">
      动作
    </label>
    <select
      id="emotion-mascot-action"
      className="beat-mascot-select"
      value={actionState.id}
      onChange={(event) => onActionChange(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {availableActions.map((action) => (
        <option key={action.id} value={action.id}>
          {action.shortLabel}
        </option>
      ))}
    </select>

    <p className="mt-1.5 truncate text-white/45">
      {emotionState.label}
      {' · '}
      {actionState.label}
    </p>
    <p className="truncate text-white/35">
      {emotionState.expression.subtitle}
    </p>
  </div>
);

export default MascotStatusPanel;

