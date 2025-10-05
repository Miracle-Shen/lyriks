import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Error, Loader, SongCard } from '../components';
import { genres } from '../assets/constants';
import { useGetTopChartsQuery, useGetSongsByGenreQuery } from '../redux/services/shazamCore';
import { selectGenreListId } from '../redux/features/playerSlice';

const Discover = () => {
  const dispatch = useDispatch();
  const divRef = useRef(null);
  const { isPlaying, activeSong } = useSelector((state) => state.player);
  const { genreListId } = useSelector((state) => state.player);

  const defaultCountry = 'DZ';
  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  });
  // 如果本地缓存已有对应内容，跳过查询
  const cacheKey = useMemo(() => {
    return genreListId ? `genre_${genreListId}` : `topCharts_${defaultCountry}`;
  }, [genreListId, defaultCountry]);
  
  const hasCache = useMemo(() => {
    try {
      return !!localStorage.getItem(cacheKey);
    } catch {
      return false;
    }
  }, [cacheKey]);
  const {
    data: topData,
    isFetching: isFetchingTop,
    error: topError,
  } = useGetTopChartsQuery(defaultCountry, { skip: !!genreListId || hasCache });
  const {
    data: genreData,
    isFetching: isFetchingGenre,
    error: genreError,
  } = useGetSongsByGenreQuery(
    { genre: genreListId, countryCode: "DZ" },
    { skip: !genreListId || hasCache }
  );
  let data = genreListId ? genreData : topData;
  let isFetching = genreListId ? isFetchingGenre : isFetchingTop;
  let error = genreListId ? genreError : topError;

  useEffect(() => {
    if (data) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        // 忽略缓存异常
      }
    }
  }, [data, cacheKey]);

  // 从缓存读取作为回退
  if (!data) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) data = JSON.parse(cached);
    } catch (e) {
      // 忽略解析异常
    }
  }

  // 安全处理数据：确保songs始终是数组
  const songs = Array.isArray(data) ? data : (data?.tracks ?? []);
  /* console.log('songs', JSON.stringify(songs,null,2)); */
  if (isFetching) return <Loader title="Loading songs..." />;
  if (error) return <Error />;

  return (
    <div className="flex flex-col gap-2">
      <div ref={divRef} className="w-full flex flex-col gap-2">
        <h2 className="mt-4 font-bold text-3xl text-white">  Discover {genreListId || 'Top'}</h2>

        {/* 音乐流派选择下拉框 */}
        <select
          onChange={(e) => {
            dispatch(selectGenreListId(e.target.value));
          }}
          value={genreListId ?? ''}
          className="bg-black text-gray-300 rounded-lg p-3 outline-none"
        >
        <option value="">推荐榜单</option>
          {genres.map((genre) => (
            <option key={genre.value} value={genre.value}>
              {genre.title}
            </option>
          ))}
        </select>
      </div>

      {/* 歌曲列表区域（flex 多行换行） */}
      <div className="flex flex-row flex-wrap gap-4">
        {songs.map((song) => (
          <SongCard
            data={songs}
            song={song}
            i={song.id}
            isPlaying={isPlaying}
            activeSong={activeSong}
          />
        ))}
      </div>
    </div>
  );
};

export default Discover;
