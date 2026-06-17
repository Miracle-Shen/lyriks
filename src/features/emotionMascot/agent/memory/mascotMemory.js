const MEMORY_KEY = 'emotionMascot.agentMemory.v1';

const readMemory = () => {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const writeMemory = (memory) => {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // Agent memory is optional; core UI should keep working without storage.
  }
};

export const mascotMemory = {
  appendEvent(event) {
    const taskID = event?.payload?.taskID ?? null;
    const type = event?.type ?? 'unknown';
    console.info(`[Mascot][Memory] APPEND type=${type} taskID=${taskID ?? '-'}`);

    const memory = readMemory();
    const events = Array.isArray(memory.events) ? memory.events : [];
    const nextEvents = [
      ...events.slice(-39),
      {
        ...event,
        createdAt: Date.now(),
      },
    ];

    writeMemory({
      ...memory,
      events: nextEvents,
    });
  },

  getSummary() {
    const memory = readMemory();
    const events = Array.isArray(memory.events) ? memory.events : [];
    const acceptedHandovers = events.filter((event) => event.type === 'handover.accepted');
    const latestState = acceptedHandovers.at(-1)?.payload ?? {};

    return {
      favoriteActionId: latestState.actionId ?? null,
      favoriteEmotionId: latestState.emotionId ?? null,
      recentEvents: events.slice(-8),
      totalEvents: events.length,
    };
  },
};
