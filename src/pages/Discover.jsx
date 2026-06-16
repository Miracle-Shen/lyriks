import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid as Grid } from 'react-window';

import { genres } from '../assets/constants';
import { Error, Loader, SongCard } from '../components';
import { getActionById } from '../features/emotionMascot/config/actionStates';
import { getEmotionById } from '../features/emotionMascot/config/emotionStates';
import { useEmotionMascot } from '../features/emotionMascot/context/EmotionMascotContext';
import { selectGenreListId } from '../redux/features/playerSlice';
import { useGetSongsByGenreQuery, useGetTopChartsQuery } from '../redux/services/shazamCore';

const defaultCountry = 'US';

const Discover = () => {
  const dispatch = useDispatch();
  const divRef = useRef(null);
  const { activeSong, isPlaying, genreListId } = useSelector((state) => state.player);
  const { actionId, effectsEnabled, emotionId, handoverDate, todayKey } = useEmotionMascot();
  const emotionState = getEmotionById(emotionId);
  const actionState = getActionById(actionId);
  const hasHandoverToday = handoverDate === todayKey;

  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const cacheKey = useMemo(
    () => (genreListId ? `genre_${genreListId}` : `topCharts_${defaultCountry}`),
    [genreListId],
  );

  const hasCache = useMemo(() => {
    try {
      return !!localStorage.getItem(cacheKey);
    } catch {
      return false;
    }
  }, [cacheKey]);

  const {
    data: topData,
    error: topError,
    isFetching: isFetchingTop,
  } = useGetTopChartsQuery(defaultCountry, { skip: !!genreListId || hasCache });

  const {
    data: genreData,
    error: genreError,
    isFetching: isFetchingGenre,
  } = useGetSongsByGenreQuery(
    { countryCode: defaultCountry, genre: genreListId },
    { skip: !genreListId || hasCache },
  );

  let data = genreListId ? genreData : topData;
  const isFetching = genreListId ? isFetchingGenre : isFetchingTop;
  const error = genreListId ? genreError : topError;

  useEffect(() => {
    if (data) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // Ignore cache write failures.
      }
    }
  }, [data, cacheKey]);

  if (!data) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) data = JSON.parse(cached);
    } catch {
      // Ignore cache read failures.
    }
  }

  const songs = Array.isArray(data) ? data : (data?.tracks ?? []);

  if (isFetching) return <Loader title="Loading songs..." />;
  if (error) return <Error />;

  return (
    <div className="flex h-screen flex-col gap-2">
      <div ref={divRef} className="flex w-full flex-col gap-2">
        <div className="mt-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-3xl text-white">Discover {genreListId || 'Top'}</h2>
          <a
            href="/project-docs/情绪团子方案.html"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/45 transition hover:border-white/20 hover:text-white/75"
          >
            方案
          </a>
        </div>

        <section className="discover-agent-status" aria-label="今日情绪团子状态">
          <div>
            <span>{hasHandoverToday ? '今日已接管' : '等待今日接管'}</span>
            <strong>
              {emotionState.label}
              {' · '}
              {actionState.label}
            </strong>
          </div>
          <p>{effectsEnabled ? '多模态陪听特效开启' : '多模态陪听特效已关闭'}</p>
        </section>

        <select
          onChange={(event) => {
            dispatch(selectGenreListId(event.target.value));
          }}
          value={genreListId ?? ''}
          className="rounded-lg bg-black p-3 text-gray-300 outline-none"
        >
          <option value="">推荐榜单</option>
          {genres.map((genre) => (
            <option key={genre.value} value={genre.value}>
              {genre.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1">
        <AutoSizer>
          {({ height, width }) => {
            const cardWidth = 160;
            const cardHeight = 220;
            const gap = 20;
            const columnWidth = cardWidth + 10;
            const rowHeight = cardHeight + gap;
            const columnCount = Math.floor(width / columnWidth) || 1;
            const rowCount = Math.ceil(songs.length / columnCount);

            return (
              <Grid
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={height}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={width}
              >
                {({ columnIndex, rowIndex, style }) => {
                  const songIndex = rowIndex * columnCount + columnIndex;
                  const song = songs[songIndex];
                  if (!song) return null;

                  return (
                    <div style={style} key={song.id} className="p-2">
                      <SongCard
                        activeSong={activeSong}
                        data={songs}
                        i={song.id}
                        isPlaying={isPlaying}
                        song={song}
                      />
                    </div>
                  );
                }}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
};

export default Discover;
