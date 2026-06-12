/* eslint-disable no-console */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const MASCOT_SIZE = 112;
const EDGE_GAP = 12;
const AUDIO_GRAPH_KEY = Symbol.for('lyriks.floatingBeatMascot.audioGraph');
const AUDIO_GRAPH_RETRY_DELAY = 2000;
const audioGraphCache = new WeakMap();
const failedAudioGraphCache = new WeakMap();
const CLICK_DRAG_THRESHOLD = 8;
const SPECTRUM_LOG_INTERVAL = 2400;
const SILENT_SPECTRUM_FRAME_LIMIT = 45;
const LOG_PREFIX = '[FloatingBeatMascot]';
let hasLoggedUnsupportedAudioContext = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

const getFallbackBeat = (audioElement) => (
  0.34
  + Math.abs(Math.sin(audioElement.currentTime * 7.5)) * 0.22
  + Math.abs(Math.sin(audioElement.currentTime * 2.1)) * 0.08
);

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

const getDefaultPosition = () => {
  if (typeof window === 'undefined') {
    return { x: EDGE_GAP, y: EDGE_GAP };
  }

  return {
    x: Math.max(EDGE_GAP, (window.innerWidth - MASCOT_SIZE) / 2),
    y: EDGE_GAP,
  };
};

const renderOriginalMascot = (isPlaying) => (
  <svg viewBox="0 0 120 120" className="h-28 w-28">
    <defs>
      <linearGradient id="mascot-body" x1="20%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="#fdf2f8" />
        <stop offset="45%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
      <linearGradient id="mascot-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <g className={isPlaying ? 'beat-mascot-note' : ''}>
      <circle cx="91" cy="24" r="5" fill="#fef08a" />
      <path d="M88 21v16c0 3-2 5-5 5-2.8 0-4.5-1.7-4.5-4 0-2.4 1.8-4.2 4.8-4.2 1 0 1.9 0.1 2.7 0.5V25l13-3.5V34c0 3-2 5-5 5-2.8 0-4.5-1.7-4.5-4 0-2.4 1.8-4.2 4.8-4.2 0.9 0 1.9 0.1 2.7 0.5v-6.6L88 21z" fill="#f59e0b" />
    </g>
    <ellipse cx="60" cy="102" rx="22" ry="7" fill="rgba(15, 23, 42, 0.12)" />
    <circle cx="60" cy="60" r="42" fill="url(#mascot-body)" />
    <ellipse cx="48" cy="34" rx="20" ry="13" fill="url(#mascot-shine)" opacity="0.52" />
    <ellipse cx="60" cy="75" rx="25" ry="12" fill="rgba(255,255,255,0.16)" />
    <circle cx="42" cy="53" r="5.5" fill="#1e1b4b" />
    <circle cx="77" cy="53" r="5.5" fill="#1e1b4b" />
    <circle cx="40" cy="68" r="6" fill="rgba(251, 113, 133, 0.35)" />
    <circle cx="80" cy="68" r="6" fill="rgba(251, 113, 133, 0.35)" />
    <path d="M48 74c4.5 5.5 19.5 5.5 24 0" stroke="#312e81" strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <path d="M36 44c5-5 11-5.5 16-1.5" stroke="rgba(49, 46, 129, 0.55)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M68 42.5c5-4 11-3.5 15 1.5" stroke="rgba(49, 46, 129, 0.55)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
  </svg>
);

const renderCatMascot = (isPlaying) => (
  <svg viewBox="0 0 120 120" className="h-28 w-28">
    <defs>
      <linearGradient id="cat-body" x1="15%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stopColor="#fff7ed" />
        <stop offset="55%" stopColor="#fed7aa" />
        <stop offset="100%" stopColor="#f9a8d4" />
      </linearGradient>
      <linearGradient id="cat-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <g className={isPlaying ? 'beat-mascot-note' : ''}>
      <circle cx="88" cy="22" r="4.5" fill="#fef08a" />
      <path d="M85 20v14.5c0 2.8-1.9 4.6-4.7 4.6-2.5 0-4.2-1.6-4.2-3.7 0-2.2 1.7-3.8 4.5-3.8 0.8 0 1.7 0.1 2.4 0.4v-7.7l12-3.1v11.7c0 2.8-1.9 4.6-4.7 4.6-2.5 0-4.2-1.6-4.2-3.7 0-2.2 1.7-3.8 4.5-3.8 0.8 0 1.7 0.1 2.4 0.4V23L85 20z" fill="#f59e0b" />
    </g>
    <ellipse cx="60" cy="103" rx="25" ry="8" fill="rgba(15, 23, 42, 0.12)" />
    <path d="M31 48 24 28c-1.4-4 2.5-7.8 6.4-6.2L48 31z" fill="url(#cat-body)" />
    <path d="M32.5 42 29 29.8 42 35.5z" fill="rgba(251, 146, 60, 0.22)" />
    <path d="M89 48 96 28c1.4-4-2.5-7.8-6.4-6.2L72 31z" fill="url(#cat-body)" />
    <path d="M87.5 42 91 29.8 78 35.5z" fill="rgba(251, 146, 60, 0.22)" />
    <path d="M20.5 61.5c0-24.2 17.2-40.5 39.5-40.5s39.5 16.3 39.5 40.5c0 23.7-16.2 35-39.5 35s-39.5-11.3-39.5-35z" fill="url(#cat-body)" />
    <ellipse cx="43.5" cy="33" rx="19" ry="11" fill="url(#cat-highlight)" opacity="0.58" />
    <ellipse cx="43" cy="56" rx="9" ry="11.2" fill="#3f3f46" />
    <ellipse cx="77" cy="56" rx="9" ry="11.2" fill="#3f3f46" />
    <circle cx="40" cy="51.5" r="3.4" fill="#fff7ed" />
    <circle cx="74" cy="51.5" r="3.4" fill="#fff7ed" />
    <circle cx="46.5" cy="60.5" r="1.9" fill="rgba(255,255,255,0.72)" />
    <circle cx="80.5" cy="60.5" r="1.9" fill="rgba(255,255,255,0.72)" />
    <path d="M37 67c2.5 4.8 9 5.4 11.8 0.7" stroke="rgba(96, 165, 250, 0.52)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    <path d="M71 67.5c2.9 4.6 9.1 4.2 11.5-0.6" stroke="rgba(96, 165, 250, 0.52)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    <circle cx="38.5" cy="72" r="6.2" fill="rgba(251, 146, 60, 0.22)" />
    <circle cx="81.5" cy="72" r="6.2" fill="rgba(251, 146, 60, 0.22)" />
    <path d="M38.5 45.5c4.4-5.2 10.2-5.9 15.6-2.1" stroke="rgba(63, 63, 70, 0.5)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    <path d="M66 43.4c5.4-3.8 11.2-3.1 15.6 2.1" stroke="rgba(63, 63, 70, 0.5)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    <path d="M56.7 67.5c1 1.4 2.1 2 3.3 2s2.3-0.6 3.3-2" stroke="#52525b" strokeWidth="3.1" strokeLinecap="round" fill="none" />
    <path d="M51 80c3.6-4.9 14.4-4.9 18 0" stroke="#52525b" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M32 63.5c5.6 0.5 9.3 1.8 14.3 4.5" stroke="rgba(82, 82, 91, 0.38)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M88 63.5c-5.6 0.5-9.3 1.8-14.3 4.5" stroke="rgba(82, 82, 91, 0.38)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M44 88c8 4.4 24 4.4 32 0" stroke="rgba(255,255,255,0.36)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
  </svg>
);

const renderSlimeMascot = (isPlaying) => (
  <svg viewBox="0 0 120 120" className="h-28 w-28">
    <defs>
      <linearGradient id="slime-body" x1="20%" y1="0%" x2="82%" y2="100%">
        <stop offset="0%" stopColor="#bbf7d0" />
        <stop offset="55%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
      <linearGradient id="slime-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
    <g className={isPlaying ? 'beat-mascot-note' : ''}>
      <circle cx="93" cy="23" r="5.3" fill="#fef08a" />
      <circle cx="101" cy="34" r="3.4" fill="#fde68a" />
      <path d="M89 20v16c0 2.9-2.1 4.8-5 4.8-2.7 0-4.5-1.7-4.5-4 0-2.4 1.8-4 4.8-4 1 0 2 0.1 2.9 0.5v-8.9l13.8-3.9v12.9c0 2.9-2.1 4.8-5 4.8-2.7 0-4.5-1.7-4.5-4 0-2.4 1.8-4 4.8-4 1 0 2 0.1 2.9 0.5v-6.4L89 20z" fill="#fb7185" />
    </g>
    <ellipse cx="60" cy="104" rx="25" ry="8" fill="rgba(15, 23, 42, 0.12)" />
    <path d="M26 72c0-18.7 6.2-34.8 18.8-42.1 3.8-2.2 7.7-8.7 15.2-8.7 7.2 0 11.3 6.3 15 8.4 12.8 7.2 19 23.4 19 42.4 0 13-10.6 21-34 21-23.1 0-34-8-34-21z" fill="url(#slime-body)" />
    <path d="M42 31c3.4-9.2 12.1-15.2 19.6-15.2 7.2 0 14.1 4.7 18.2 12.8" stroke="rgba(16, 185, 129, 0.58)" strokeWidth="5.4" strokeLinecap="round" fill="none" />
    <path d="M33 38c-4.4-2.4-7.6-5.7-9.4-9.8" stroke="rgba(34, 211, 238, 0.58)" strokeWidth="4.2" strokeLinecap="round" fill="none" />
    <path d="M87 38c4.4-2.4 7.6-5.7 9.4-9.8" stroke="rgba(34, 211, 238, 0.58)" strokeWidth="4.2" strokeLinecap="round" fill="none" />
    <ellipse cx="45" cy="39" rx="18" ry="10.5" fill="url(#slime-highlight)" opacity="0.52" />
    <ellipse cx="43" cy="56" rx="6.2" ry="8.8" fill="#064e3b" />
    <ellipse cx="77" cy="56" rx="6.2" ry="8.8" fill="#064e3b" />
    <circle cx="41.2" cy="52" r="2.3" fill="#d1fae5" />
    <circle cx="75.2" cy="52" r="2.3" fill="#d1fae5" />
    <circle cx="39" cy="73" r="6.2" fill="rgba(255,255,255,0.2)" />
    <circle cx="81" cy="73" r="6.2" fill="rgba(255,255,255,0.2)" />
    <path d="M40 44.5c4.6-5.8 10.1-6.1 15.2-1" stroke="rgba(6, 78, 59, 0.48)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    <path d="M64.8 43.5c5.1-5.1 10.6-4.8 15.2 1" stroke="rgba(6, 78, 59, 0.48)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    <path d="M47.5 71.5c5.2 11.2 19.8 11.2 25 0 0 0-4.3 4.2-12.5 4.2s-12.5-4.2-12.5-4.2z" fill="#065f46" />
    <path d="M52.5 77.5c4.2 3.6 10.8 3.6 15 0" stroke="#f9a8d4" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    <path d="M51.5 66.5c2.5 3 5.3 4.5 8.5 4.5s6-1.5 8.5-4.5" stroke="#10b981" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    <circle cx="28" cy="50" r="3.8" fill="rgba(255,255,255,0.45)" />
    <circle cx="94" cy="46" r="3.1" fill="rgba(255,255,255,0.4)" />
    <circle cx="101" cy="57" r="4.4" fill="rgba(255,255,255,0.32)" />
    <path d="M22 60 15 56" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
    <path d="M98 68 106 66" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const renderTravelOutfit = () => (
  <svg viewBox="0 0 120 120" className="pointer-events-none absolute inset-0 h-28 w-28">
    <path d="M39 36c6-7.5 29-10 42-2 2.8 1.7 2.5 6.1-0.6 7.2-12.1 4.5-25.2 5.3-39.7 2.2-3.6-0.8-4-4.6-1.7-7.4z" fill="#38bdf8" />
    <path d="M45 32c5.6-5.2 19.1-7.3 29.5-2.7l-0.6 5.7c-10.1-2.9-19.4-1.6-27.9 2.9z" fill="#fef3c7" />
    <path d="M53 28.5c5.4-2.7 12.1-3.2 18.5-1.1l-0.5 4.3c-6.1-1.6-11.8-1.2-17.2 1.1z" fill="#fb7185" opacity="0.95" />
    <path d="M30 73c9 7.6 45.9 8.6 60 0 1.7 6.6 0.7 14.3-4.2 19.2-7.6 7.6-43.7 7.6-51.4 0-4.9-4.9-6-12.6-4.4-19.2z" fill="#fde68a" opacity="0.96" />
    <path d="M36 79c10.8 4.6 36.5 5.2 48.4 0.1" stroke="#0f766e" strokeWidth="4.4" strokeLinecap="round" fill="none" />
    <path d="M45 78v17M75 79v17" stroke="#f97316" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    <path d="M31 70c6 4.2 14 6.1 24 5.6" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M89 70c-6 4.2-14 6.1-24 5.6" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" fill="none" />
    <circle cx="88" cy="83" r="5.5" fill="#f97316" />
    <path d="M85.5 82.8h5M88 80.3v5" stroke="#fff7ed" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const mascotVariants = [
  {
    id: 'original',
    label: '团子',
    subtitle: '开心',
    shadow: 'rgba(129, 140, 248,',
    motion: {
      beatMultiplier: 1,
      beatOffset: 0,
      response: 0.2,
      bounceHeight: 18,
      scaleX: 0.08,
      scaleY: 0.04,
      tiltScale: 12,
      idleSpeed: 700,
      idleAmount: 0.05,
    },
    render: renderOriginalMascot,
  },
  {
    id: 'cat',
    label: '猫咪团子',
    subtitle: '可怜巴巴模式',
    shadow: 'rgba(251, 146, 60,',
    motion: {
      beatMultiplier: 0.56,
      beatOffset: 0.04,
      response: 0.08,
      bounceHeight: 11,
      scaleX: 0.04,
      scaleY: 0.02,
      tiltScale: 5,
      idleSpeed: 1200,
      idleAmount: 0.025,
    },
    render: renderCatMascot,
  },
  {
    id: 'slime',
    label: '果冻史莱姆',
    subtitle: '兴奋激动模式',
    shadow: 'rgba(34, 211, 238,',
    motion: {
      beatMultiplier: 1.12,
      beatOffset: 0,
      response: 0.24,
      bounceHeight: 20,
      scaleX: 0.1,
      scaleY: 0.055,
      tiltScale: 14,
      idleSpeed: 620,
      idleAmount: 0.06,
    },
    render: renderSlimeMascot,
  },
];

const FloatingBeatMascot = () => {
  const { activeSong, isPlaying } = useSelector((state) => state.player);
  const { audioElement } = useAudioPlayer();
  const [position, setPosition] = useState(getDefaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [mascotIndex, setMascotIndex] = useState(0);
  const [hasTravelOutfit, setHasTravelOutfit] = useState(false);
  const [motion, setMotion] = useState({
    bounce: 0.12,
    glow: 0.18,
    tilt: 0,
  });
  const dragStateRef = useRef({
    active: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    pointerId: null,
  });
  const smoothedBeatRef = useRef(0.12);
  const spectrumLogRef = useRef({
    hasLoggedMissingAudio: false,
    hasLoggedFallback: false,
    hasLoggedResume: false,
    hasLoggedSilentSpectrum: false,
    lastSpectrumLogAt: 0,
  });
  const hasSong = Boolean(activeSong?.attributes?.name);
  const activeMascot = mascotVariants[mascotIndex];
  const motionProfile = activeMascot.motion;

  const songMeta = useMemo(() => ({
    artist: activeSong?.attributes?.artistName || '',
    title: activeSong?.attributes?.name || '',
  }), [activeSong]);

  useEffect(() => {
    spectrumLogRef.current = {
      hasLoggedMissingAudio: false,
      hasLoggedFallback: false,
      hasLoggedResume: false,
      hasLoggedSilentSpectrum: false,
      lastSpectrumLogAt: 0,
    };
  }, [audioElement, activeSong?.attributes?.name]);

  useEffect(() => {
    const updatePositionOnResize = () => {
      setPosition((currentPosition) => ({
        x: clamp(currentPosition.x, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - MASCOT_SIZE - EDGE_GAP)),
        y: clamp(currentPosition.y, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - MASCOT_SIZE - EDGE_GAP)),
      }));
    };

    window.addEventListener('resize', updatePositionOnResize);

    return () => {
      window.removeEventListener('resize', updatePositionOnResize);
    };
  }, []);

  useEffect(() => {
    if (!hasSong) {
      setPosition(getDefaultPosition());
    }
  }, [hasSong]);

  useEffect(() => {
    if (!hasSong) return undefined;

    let animationFrameId = 0;

    const updateMotion = () => {
      const now = performance.now();
      let nextBeat = 0.1;

      if (isPlaying && audioElement) {
        const graph = ensureAudioGraph(audioElement);

        if (graph) {
          if (graph.context.state === 'suspended') {
            if (!spectrumLogRef.current.hasLoggedResume) {
              console.info(`${LOG_PREFIX} AudioContext 处于 suspended，尝试恢复真实频谱读取。`);
              spectrumLogRef.current.hasLoggedResume = true;
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

          if (graph.silentFrames > SILENT_SPECTRUM_FRAME_LIMIT && audioElement.duration) {
            if (!spectrumLogRef.current.hasLoggedSilentSpectrum) {
              console.warn(`${LOG_PREFIX} 真实频谱持续为静音，改用播放进度驱动可视节奏。`, {
                sourceType: graph.type,
                currentSrc: audioElement.currentSrc,
                readyState: audioElement.readyState,
              });
              spectrumLogRef.current.hasLoggedSilentSpectrum = true;
            }
            nextBeat = clamp(getFallbackBeat(audioElement), 0.18, 0.82);
          } else {
            nextBeat = clamp(rawLevel * 2.8, 0.1, 1);
          }

          if ((now - spectrumLogRef.current.lastSpectrumLogAt) > SPECTRUM_LOG_INTERVAL) {
            console.log(`${LOG_PREFIX} 正在读取真实音频频谱。`, {
              rawLevel: Number(rawLevel.toFixed(3)),
              bassLevel: Number(bassLevel.toFixed(3)),
              midLevel: Number(midLevel.toFixed(3)),
              fullLevel: Number(fullLevel.toFixed(3)),
              timeLevel: Number(timeLevel.toFixed(3)),
              beatLevel: Number(nextBeat.toFixed(3)),
              silentFrames: graph.silentFrames,
              sourceType: graph.type,
              currentTime: Number(audioElement.currentTime.toFixed(2)),
              contextState: graph.context.state,
            });
            spectrumLogRef.current.lastSpectrumLogAt = now;
          }
        } else if (audioElement.duration) {
          if (!spectrumLogRef.current.hasLoggedFallback) {
            console.log(`${LOG_PREFIX} 未读取到真实频谱，当前使用模拟节奏。`, {
              duration: Number(audioElement.duration.toFixed(2)),
              currentTime: Number(audioElement.currentTime.toFixed(2)),
            });
            spectrumLogRef.current.hasLoggedFallback = true;
          }
          nextBeat = getFallbackBeat(audioElement);
        }
      } else if (isPlaying && !audioElement) {
        if (!spectrumLogRef.current.hasLoggedMissingAudio) {
          console.log(`${LOG_PREFIX} 当前没有可用的 audio 元素，暂时无法读取真实频谱。`);
          spectrumLogRef.current.hasLoggedMissingAudio = true;
        }
      } else {
        nextBeat = 0.1 + Math.abs(Math.sin(now / motionProfile.idleSpeed)) * motionProfile.idleAmount;
      }

      const profiledBeat = clamp(
        (nextBeat * motionProfile.beatMultiplier) + motionProfile.beatOffset,
        0.08,
        1,
      );

      smoothedBeatRef.current = (
        smoothedBeatRef.current * (1 - motionProfile.response)
      ) + (profiledBeat * motionProfile.response);

      setMotion({
        bounce: smoothedBeatRef.current,
        glow: clamp(smoothedBeatRef.current * 0.95, 0.12, 0.95),
        tilt: isPlaying
          ? (smoothedBeatRef.current - 0.32) * motionProfile.tiltScale
          : Math.sin(now / motionProfile.idleSpeed) * 2,
      });

      animationFrameId = window.requestAnimationFrame(updateMotion);
    };

    animationFrameId = window.requestAnimationFrame(updateMotion);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [audioElement, hasSong, isPlaying, motionProfile]);

  const handlePointerDown = useCallback((event) => {
    const targetRect = event.currentTarget.getBoundingClientRect();

    dragStateRef.current = {
      active: true,
      offsetX: event.clientX - targetRect.left,
      offsetY: event.clientY - targetRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handleTravelOutfitToggle = useCallback((event) => {
    event.stopPropagation();
    setHasTravelOutfit((currentValue) => !currentValue);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;
      if (Math.hypot(deltaX, deltaY) > CLICK_DRAG_THRESHOLD) {
        dragStateRef.current.moved = true;
      }

      setPosition({
        x: clamp(event.clientX - dragStateRef.current.offsetX, EDGE_GAP, Math.max(EDGE_GAP, window.innerWidth - MASCOT_SIZE - EDGE_GAP)),
        y: clamp(event.clientY - dragStateRef.current.offsetY, EDGE_GAP, Math.max(EDGE_GAP, window.innerHeight - MASCOT_SIZE - EDGE_GAP)),
      });
    };

    const handlePointerUp = (event) => {
      if (dragStateRef.current.pointerId !== event.pointerId) return;

      if (!dragStateRef.current.moved) {
        setMascotIndex((currentIndex) => (currentIndex + 1) % mascotVariants.length);
      }

      dragStateRef.current = {
        active: false,
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        moved: false,
        pointerId: null,
      };
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  if (!hasSong) return null;

  const bounceHeight = isDragging ? 0 : motion.bounce * motionProfile.bounceHeight;
  const scaleX = isDragging ? 1.02 : 1 + (motion.bounce * motionProfile.scaleX);
  const scaleY = isDragging ? 0.98 : 1 - (motion.bounce * motionProfile.scaleY);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <div
        className="pointer-events-auto absolute select-none"
        onPointerDown={handlePointerDown}
        role="presentation"
        style={{
          left: position.x,
          top: position.y,
          touchAction: 'none',
          width: `${MASCOT_SIZE}px`,
        }}
      >
        <div className="relative flex cursor-grab active:cursor-grabbing flex-col items-center">
          <div
            className="beat-mascot-shadow"
            style={{
              opacity: 0.18 + (motion.glow * 0.4),
              transform: `scale(${0.88 + (motion.bounce * 0.16)})`,
            }}
          />
          <div
            className="beat-mascot-shell"
            style={{
              filter: `drop-shadow(0 12px 22px ${activeMascot.shadow} ${0.24 + (motion.glow * 0.2)}))`,
              transform: `translate3d(0, ${-bounceHeight}px, 0) rotate(${motion.tilt}deg) scale(${scaleX}, ${scaleY})`,
            }}
          >
            {activeMascot.render(isPlaying)}
            {hasTravelOutfit && renderTravelOutfit()}
          </div>
          <div className="mt-1 rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-center text-[10px] leading-4 text-white/90 backdrop-blur-md">
            <p className="max-w-[132px] truncate text-[9px] uppercase tracking-[0.2em] text-white/55">{activeMascot.label}</p>
            <p className="max-w-[132px] truncate font-semibold">{songMeta.title}</p>
            <p className="max-w-[132px] truncate text-white/65">{songMeta.artist}</p>
            <p className="max-w-[132px] truncate text-white/45">{activeMascot.subtitle} · 点击切换</p>
            <button
              type="button"
              className={`mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                hasTravelOutfit
                  ? 'bg-cyan-300 text-slate-950'
                  : 'bg-white/12 text-white/85 hover:bg-white/20'
              }`}
              onClick={handleTravelOutfitToggle}
              onPointerDown={(event) => event.stopPropagation()}
            >
              VIP 旅行衣
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingBeatMascot;
