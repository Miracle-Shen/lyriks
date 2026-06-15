import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  HiOutlineChevronLeft,
  HiOutlineLightningBolt,
  HiOutlineMusicNote,
  HiOutlineSparkles,
} from 'react-icons/hi';

const MAX_ENERGY = 100;

const getArtworkUrl = (song, size = 900) => (
  song?.attributes?.artwork?.url
    ?.replace('{w}', size)
    ?.replace('{h}', size)
);

const getSongMetaRows = (song) => {
  const attributes = song?.attributes ?? {};

  return [
    { label: '歌曲', value: attributes.name },
    { label: '歌手', value: attributes.artistName },
    { label: '专辑', value: attributes.albumName },
    { label: '曲风', value: attributes.genreNames?.join(' / ') },
    { label: '发行日期', value: attributes.releaseDate },
    { label: '歌词状态', value: attributes.hasLyrics ? '可接入歌词能力' : '暂无歌词数据' },
  ].filter((row) => row.value);
};

const lyricLines = [
  '雨滴落在窗边，团子把耳机抱紧一点。',
  '每一段旋律都像一盏慢慢亮起的小灯。',
  '不用马上开心，先把这一首歌听完就很好。',
  '情绪被听见的时候，夜晚会变得轻一点。',
];

const createDrop = () => {
  const dropTypes = [
    { type: 'rain', label: '雨滴音符', value: 5 },
    { type: 'lyric', label: '歌词碎片', value: 9 },
    { type: 'glow', label: '共鸣光点', value: 14 },
  ];
  const item = dropTypes[Math.floor(Math.random() * dropTypes.length)];

  return {
    ...item,
    id: `${Date.now()}-${Math.random()}`,
    left: 12 + Math.random() * 72,
    duration: 4200 + Math.random() * 1600,
  };
};

const EnergyDrop = ({ drop, onCollect }) => (
  <button
    type="button"
    className={`play-space-drop is-${drop.type}`}
    style={{
      left: `${drop.left}%`,
      animationDuration: `${drop.duration}ms`,
    }}
    aria-label={`收集${drop.label}`}
    onClick={() => onCollect(drop)}
  >
    {drop.type === 'rain' ? <HiOutlineMusicNote /> : null}
    {drop.type === 'lyric' ? <span>词</span> : null}
    {drop.type === 'glow' ? <HiOutlineSparkles /> : null}
  </button>
);

const EmoEnergyGame = ({ isPlaying }) => {
  const [energy, setEnergy] = useState(18);
  const [drops, setDrops] = useState([]);
  const [collectedCount, setCollectedCount] = useState(0);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const energyTimer = window.setInterval(() => {
      setEnergy((currentEnergy) => Math.min(MAX_ENERGY, currentEnergy + 1));
    }, 1200);

    const dropTimer = window.setInterval(() => {
      setDrops((currentDrops) => [...currentDrops.slice(-7), createDrop()]);
    }, 2600);

    return () => {
      window.clearInterval(energyTimer);
      window.clearInterval(dropTimer);
    };
  }, [isPlaying]);

  useEffect(() => {
    const cleanTimer = window.setInterval(() => {
      const now = Date.now();
      setDrops((currentDrops) => currentDrops.filter((drop) => now - Number(drop.id.split('-')[0]) < drop.duration + 800));
    }, 1400);

    return () => {
      window.clearInterval(cleanTimer);
    };
  }, []);

  const handleCollectDrop = (drop) => {
    setEnergy((currentEnergy) => Math.min(MAX_ENERGY, currentEnergy + drop.value));
    setCollectedCount((currentCount) => currentCount + 1);
    setDrops((currentDrops) => currentDrops.filter((currentDrop) => currentDrop.id !== drop.id));
  };

  const isComplete = energy >= MAX_ENERGY;

  return (
    <section className="play-space-game">
      <div className="play-space-section-heading">
        <div>
          <p>宠物小游戏</p>
          <h2>雨夜补给站</h2>
        </div>
        <span className="play-space-status-pill">
          <HiOutlineLightningBolt />
          EMO
        </span>
      </div>

      <div className="play-space-game-stage">
        <div className="play-space-rain" />
        <div className="play-space-moon" />
        {drops.map((drop) => (
          <EnergyDrop key={drop.id} drop={drop} onCollect={handleCollectDrop} />
        ))}

        <div className={`play-space-emo-pet ${isComplete ? 'is-complete' : ''}`}>
          <div className="play-space-cloud" />
          <div className="play-space-pet-body">
            <span className="play-space-pet-eye" />
            <span className="play-space-pet-eye" />
            <span className="play-space-pet-mouth" />
          </div>
          <div className="play-space-pet-light" />
        </div>
      </div>

      <div className="play-space-energy-panel">
        <div className="play-space-energy-copy">
          <p>{isPlaying ? '播放中，正在积累共鸣能量' : '播放歌曲后开始掉落情绪能量'}</p>
          <strong>{isComplete ? '今天也有好好听完自己的心情。' : '为 EMO 小宠物加油叭'}</strong>
        </div>
        <div className="play-space-energy-bar" aria-label="共鸣能量">
          <span style={{ width: `${energy}%` }} />
        </div>
        <div className="play-space-game-stats">
          <span>{energy}% 共鸣能量</span>
          <span>已收集 {collectedCount} 个光点</span>
        </div>
      </div>
    </section>
  );
};

const PlaySpace = () => {
  const { activeSong, isActive, isPlaying } = useSelector((state) => state.player);
  const artworkUrl = getArtworkUrl(activeSong);
  const songMetaRows = useMemo(() => getSongMetaRows(activeSong), [activeSong]);

  if (!isActive || !activeSong?.attributes?.name) {
    return (
      <main className="play-space-page">
        <div className="play-space-empty">
          <HiOutlineMusicNote />
          <h1>先播放一首歌</h1>
          <p>点击首页歌曲卡片播放后，再从旋转封面进入歌词和宠物小游戏页面。</p>
          <Link to="/">返回首页</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="play-space-page">
      <Link to="/" className="play-space-back-link">
        <HiOutlineChevronLeft />
        返回发现
      </Link>

      <section className="play-space-hero">
        <div className="play-space-cover-wrap">
          <img src={artworkUrl} alt="当前歌曲封面" className="play-space-cover" />
        </div>
        <div className="play-space-hero-copy">
          <p>Now Playing</p>
          <h1>{activeSong.attributes.name}</h1>
          <h2>{activeSong.attributes.artistName}</h2>
        </div>
      </section>

      <div className="play-space-grid">
        <section className="play-space-lyrics">
          <div className="play-space-section-heading">
            <div>
              <p>歌词与信息</p>
              <h2>一起听这一首</h2>
            </div>
            <span className="play-space-status-pill">{activeSong.attributes.hasLyrics ? '有歌词' : '基础信息'}</span>
          </div>

          <div className="play-space-lyric-board">
            {lyricLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="play-space-meta-list">
            {songMetaRows.map((row) => (
              <div key={row.label} className="play-space-meta-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <EmoEnergyGame isPlaying={isPlaying} />
      </div>
    </main>
  );
};

export default PlaySpace;

