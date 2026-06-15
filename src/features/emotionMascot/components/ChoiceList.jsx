const ChoiceList = ({
  items,
  selectedId,
  onSelect,
  getDisabled = () => false,
}) => (
  <div className="emotion-mascot-choice-grid">
    {items.map((item) => {
      const isSelected = selectedId === item.id;
      const isDisabled = getDisabled(item);

      return (
        <button
          key={item.id}
          type="button"
          className={`emotion-mascot-choice ${isSelected ? 'is-selected' : ''}`}
          disabled={isDisabled}
          onClick={() => onSelect(item.id)}
        >
          <span className="emotion-mascot-choice-title">{item.label}</span>
          {item.description || item.intent || item.shortLabel ? (
            <span className="emotion-mascot-choice-desc">
              {item.description || item.intent || item.shortLabel}
            </span>
          ) : null}
        </button>
      );
    })}
  </div>
);

export default ChoiceList;

