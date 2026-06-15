const MascotFigure = ({
  actionState,
  emotionState,
  isDragging,
  isPlaying,
  mascot,
  motion,
}) => {
  const Mascot = mascot.Component;
  const Outfit = actionState.Outfit;
  const motionProfile = emotionState.expression.motion;
  const bounceHeight = isDragging ? 0 : motion.bounce * motionProfile.bounceHeight;
  const scaleX = isDragging ? 1.02 : 1 + (motion.bounce * motionProfile.scaleX);
  const scaleY = isDragging ? 0.98 : 1 - (motion.bounce * motionProfile.scaleY);

  return (
    <>
      <div
        className="beat-mascot-shadow"
        style={{
          opacity: 0.18 + (motion.glow * 0.4),
          transform: `scale(${0.88 + (motion.bounce * 0.16)})`,
        }}
      />
      <div
        className={`beat-mascot-shell ${actionState.motionClassName}`}
        style={{
          filter: `drop-shadow(0 12px 22px ${emotionState.expression.aura} ${0.24 + (motion.glow * 0.2)}))`,
          transform: `translate3d(0, ${-bounceHeight}px, 0) rotate(${motion.tilt}deg) scale(${scaleX}, ${scaleY})`,
        }}
      >
        <Mascot isPlaying={isPlaying} />
        <Outfit />
      </div>
    </>
  );
};

export default MascotFigure;

