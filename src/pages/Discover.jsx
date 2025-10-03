import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Error, Loader, SongCard } from '../components';
import { genres } from '../assets/constants';
import { useGetTopChartsQuery } from '../redux/services/shazamCore';
import { selectGenreListId } from '../redux/features/playerSlice';

// Discover页面组件定义
const Discover = () => {
  const dispatch = useDispatch();
  const { isPlaying, activeSong } = useSelector((state) => state.player);
  const { genreListId } = useSelector((state) => state.player);
  const selectedGenre = genreListId || genres[0]?.value || 'DZ';

  const { data, isFetching, error } = useGetTopChartsQuery(selectedGenre);

  // 缓存数据到 localStorage（按流派分组）
  useEffect(() => {
    if (data) {
      try {
        localStorage.setItem(`topCharts_${selectedGenre}`, JSON.stringify(data));
      } catch (e) {
        // 忽略缓存异常
      }
    }
  }, [data, selectedGenre]);

  // 从缓存读取作为回退
  let dataset = data;
  if (!dataset) {
    try {
      const cached = localStorage.getItem(`topCharts_${selectedGenre}`);
      if (cached) dataset = JSON.parse(cached);
    } catch (e) {
      // 忽略解析异常
    }
  }

  // 安全处理数据：确保songs始终是数组
  const songs = Array.isArray(dataset) ? dataset : (dataset?.tracks ?? []);
  /* console.log('songs', JSON.stringify(songs,null,2)); */
  if (isFetching) return <Loader title="Loading songs..." />;
  if (error) return <Error />;

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full flex flex-col gap-2">
        <h2 className="font-bold text-3xl text-white">Discover {selectedGenre}</h2>

        {/* 音乐流派选择下拉框 */}
        <select
          onChange={(e) => {
            dispatch(selectGenreListId(e.target.value));
          }}
          value={selectedGenre}
          className="bg-black text-gray-300 rounded-lg p-3 outline-none"
        >
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
