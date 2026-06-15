/* eslint-disable no-console */
import { clamp } from './math';

const AUDIO_GRAPH_KEY = Symbol.for('lyriks.floatingBeatMascot.audioGraph');
const AUDIO_GRAPH_RETRY_DELAY = 2000;
const SPECTRUM_LOG_INTERVAL = 2400;
const SILENT_SPECTRUM_FRAME_LIMIT = 45;
const LOG_PREFIX = '[EmotionMascot]';

const audioGraphCache = new WeakMap();
const failedAudioGraphCache = new WeakMap();
let hasLoggedUnsupportedAudioContext = false;

const getElementAudioGraph = (audioElement) => audioElement?.[AUDIO_GRAPH_KEY] ?? null;

const setElementAudioGraph = (audioElement, graph) => {
  if (!audioElement) return;

  Object.defineProperty(audioElement, AUDIO_GRAPH_KEY, {
    configurable: true,
    value: graph,
  });
};

const normalizeAudioGraph = (graph) => {
  if (!graph) return null;

  if (!graph.timeDataArray || graph.timeDataArray.length !== graph.analyser.fftSize) {
    graph.timeDataArray = new Uint8Array(graph.analyser.fftSize);
  }
  if (typeof graph.silentFrames !== 'number') {
    graph.silentFrames = 0;
  }

  return graph;
};

const createMediaStreamSource = (context, audioElement) => {
  const captureStream = audioElement.captureStream || audioElement.mozCaptureStream;
  if (!captureStream) return null;

  const stream = captureStream.call(audioElement);
  if (!stream) return null;

  return context.createMediaStreamSource(stream);
};

const createAudioGraph = (context, audioElement) => {
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  try {
    const source = context.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(context.destination);

    return {
      analyser,
      context,
      dataArray: new Uint8Array(analyser.frequencyBinCount),
      timeDataArray: new Uint8Array(analyser.fftSize),
      silentFrames: 0,
      source,
      type: 'media-element',
    };
  } catch (error) {
    if (error?.name !== 'InvalidStateError') {
      throw error;
    }

    const source = createMediaStreamSource(context, audioElement);
    if (!source) {
      throw error;
    }

    source.connect(analyser);

    return {
      analyser,
      context,
      dataArray: new Uint8Array(analyser.frequencyBinCount),
      timeDataArray: new Uint8Array(analyser.fftSize),
      silentFrames: 0,
      source,
      type: 'media-stream',
    };
  }
};

const getAverageLevel = (dataArray, startRatio, endRatio) => {
  const startIndex = Math.floor(dataArray.length * startRatio);
  const endIndex = Math.max(startIndex + 1, Math.floor(dataArray.length * endRatio));
  let sum = 0;

  for (let index = startIndex; index < endIndex; index += 1) {
    sum += dataArray[index];
  }

  return sum / ((endIndex - startIndex) * 255);
};

const getTimeDomainLevel = (timeDataArray) => {
  let sum = 0;

  for (let index = 0; index < timeDataArray.length; index += 1) {
    const normalizedSample = (timeDataArray[index] - 128) / 128;
    sum += normalizedSample * normalizedSample;
  }

  return Math.sqrt(sum / timeDataArray.length);
};

const ensureAudioGraph = (audioElement) => {
  if (!audioElement || typeof window === 'undefined') return null;

  const elementGraph = getElementAudioGraph(audioElement);
  if (elementGraph) {
    const graph = normalizeAudioGraph(elementGraph);
    audioGraphCache.set(audioElement, graph);
    return graph;
  }

  const cachedGraph = audioGraphCache.get(audioElement);
  if (cachedGraph) return normalizeAudioGraph(cachedGraph);

  const failedGraph = failedAudioGraphCache.get(audioElement);
  if (failedGraph && performance.now() < failedGraph.retryAt) return null;

  const safariWindow = /** @type {Window & { webkitAudioContext?: typeof AudioContext }} */ (window);
  const AudioContextConstructor = window.AudioContext || safariWindow.webkitAudioContext;
  if (!AudioContextConstructor) {
    if (!hasLoggedUnsupportedAudioContext) {
      console.warn(`${LOG_PREFIX} 当前浏览器不支持 AudioContext，已退回模拟节奏。`);
      hasLoggedUnsupportedAudioContext = true;
    }
    return null;
  }

  try {
    const context = new AudioContextConstructor();
    const graph = createAudioGraph(context, audioElement);

    audioGraphCache.set(audioElement, graph);
    setElementAudioGraph(audioElement, graph);
    console.info(`${LOG_PREFIX} 已创建真实音频频谱分析器。`, { sourceType: graph.type });
    return graph;
  } catch (error) {
    failedAudioGraphCache.set(audioElement, {
      retryAt: performance.now() + AUDIO_GRAPH_RETRY_DELAY,
    });
    console.warn(`${LOG_PREFIX} 创建真实音频频谱分析器失败，已退回模拟节奏。`, error);
    return null;
  }
};

export const createSpectrumLogState = () => ({
  hasLoggedMissingAudio: false,
  hasLoggedFallback: false,
  hasLoggedResume: false,
  hasLoggedSilentSpectrum: false,
  lastSpectrumLogAt: 0,
});

export const getFallbackBeat = (audioElement) => (
  0.34
  + Math.abs(Math.sin(audioElement.currentTime * 7.5)) * 0.22
  + Math.abs(Math.sin(audioElement.currentTime * 2.1)) * 0.08
);

export const readAudioBeat = ({
  audioElement,
  isPlaying,
  logState,
}) => {
  const now = performance.now();

  if (!isPlaying) {
    return { beat: null, now };
  }

  if (!audioElement) {
    if (!logState.hasLoggedMissingAudio) {
      console.log(`${LOG_PREFIX} 当前没有可用的 audio 元素，暂时无法读取真实频谱。`);
      logState.hasLoggedMissingAudio = true;
    }
    return { beat: 0.1, now };
  }

  const graph = ensureAudioGraph(audioElement);

  if (!graph) {
    if (audioElement.duration && !logState.hasLoggedFallback) {
      console.log(`${LOG_PREFIX} 未读取到真实频谱，当前使用模拟节奏。`, {
        duration: Number(audioElement.duration.toFixed(2)),
        currentTime: Number(audioElement.currentTime.toFixed(2)),
      });
      logState.hasLoggedFallback = true;
    }

    return {
      beat: audioElement.duration ? getFallbackBeat(audioElement) : 0.1,
      now,
    };
  }

  if (graph.context.state === 'suspended') {
    if (!logState.hasLoggedResume) {
      console.info(`${LOG_PREFIX} AudioContext 处于 suspended，尝试恢复真实频谱读取。`);
      logState.hasLoggedResume = true;
    }
    graph.context.resume().catch(() => {});
  }

  graph.analyser.getByteFrequencyData(graph.dataArray);
  graph.analyser.getByteTimeDomainData(graph.timeDataArray);

  const bassLevel = getAverageLevel(graph.dataArray, 0, 0.22);
  const midLevel = getAverageLevel(graph.dataArray, 0.22, 0.62);
  const fullLevel = getAverageLevel(graph.dataArray, 0, 1);
  const timeLevel = getTimeDomainLevel(graph.timeDataArray);
  const rawLevel = Math.max(
    bassLevel * 1.15,
    midLevel * 0.95,
    fullLevel * 1.35,
    timeLevel * 1.8,
  );
  const hasLiveSignal = rawLevel > 0.006;

  graph.silentFrames = hasLiveSignal ? 0 : graph.silentFrames + 1;

  let beat = clamp(rawLevel * 2.8, 0.1, 1);
  if (graph.silentFrames > SILENT_SPECTRUM_FRAME_LIMIT && audioElement.duration) {
    if (!logState.hasLoggedSilentSpectrum) {
      console.warn(`${LOG_PREFIX} 真实频谱持续为静音，改用播放进度驱动可视节奏。`, {
        sourceType: graph.type,
        currentSrc: audioElement.currentSrc,
        readyState: audioElement.readyState,
      });
      logState.hasLoggedSilentSpectrum = true;
    }
    beat = clamp(getFallbackBeat(audioElement), 0.18, 0.82);
  }

  if ((now - logState.lastSpectrumLogAt) > SPECTRUM_LOG_INTERVAL) {
    console.log(`${LOG_PREFIX} 正在读取真实音频频谱。`, {
      rawLevel: Number(rawLevel.toFixed(3)),
      bassLevel: Number(bassLevel.toFixed(3)),
      midLevel: Number(midLevel.toFixed(3)),
      fullLevel: Number(fullLevel.toFixed(3)),
      timeLevel: Number(timeLevel.toFixed(3)),
      beatLevel: Number(beat.toFixed(3)),
      silentFrames: graph.silentFrames,
      sourceType: graph.type,
      currentTime: Number(audioElement.currentTime.toFixed(2)),
      contextState: graph.context.state,
    });
    logState.lastSpectrumLogAt = now;
  }

  return { beat, now };
};

