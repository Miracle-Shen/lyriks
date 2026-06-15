const OriginalMascot = ({ isPlaying }) => (
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

const CatMascot = ({ isPlaying }) => (
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

const SlimeMascot = ({ isPlaying }) => (
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

export const mascotVariants = [
  {
    id: 'original',
    label: '圆滚滚团子',
    description: '默认陪伴形象',
    Component: OriginalMascot,
  },
  {
    id: 'cat',
    label: '猫咪团子',
    description: '动物型团子',
    Component: CatMascot,
  },
  {
    id: 'slime',
    label: '果冻团子',
    description: '漂浮型团子',
    Component: SlimeMascot,
  },
];

