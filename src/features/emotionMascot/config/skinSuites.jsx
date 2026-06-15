const MusicGlowEffect = () => (
  <svg viewBox="0 0 120 120" className="pointer-events-none absolute inset-0 h-28 w-28">
    <circle cx="60" cy="61" r="49" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="2" strokeDasharray="5 8" />
    <path d="M28 37c8-9 18-13 31-13 16 0 28 6 36 18" stroke="rgba(103,232,249,0.46)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M30 87c9 7 19 10 30 10 14 0 25-4 33-13" stroke="rgba(244,114,182,0.42)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <circle cx="26" cy="62" r="3.2" fill="#fef08a" />
    <circle cx="94" cy="58" r="3.2" fill="#67e8f9" />
  </svg>
);

export const skinSuites = [
  {
    id: 'action',
    label: '动作套装',
    description: '跟随当前动作状态',
    showActionOutfit: true,
    Effect: null,
  },
  {
    id: 'base',
    label: '基础套装',
    description: '只保留宠物本体',
    showActionOutfit: false,
    Effect: null,
  },
  {
    id: 'musicGlow',
    label: '音乐微光',
    description: '动作状态 + 音乐光环',
    showActionOutfit: true,
    Effect: MusicGlowEffect,
  },
];

export const defaultSkinSuiteId = 'action';

export const getSkinSuiteById = (skinSuiteId) => (
  skinSuites.find((skinSuite) => skinSuite.id === skinSuiteId) ?? skinSuites[0]
);

