import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import PlayPause from './PlayPause';
import { playPause, setActiveSong } from '../redux/features/playerSlice';

const SongCard = ({ song, i, isPlaying, activeSong, data }) => {
  const dispatch = useDispatch();

  const handlePauseClick = () => {
    dispatch(playPause(false));
  };

  const handlePlayClick = () => {
    dispatch(setActiveSong({ song, data, i }));
    dispatch(playPause(true));
  };

  return (
    <div className="flex flex-col w-[220px] p-3 bg-white/5 backdrop-blur-sm rounded-lg cursor-pointer">
      <div className="relative w-full sm:aspect-square lg:aspect-[3/4] group overflow-hidden rounded-lg">
        <div
          className={`absolute inset-0 justify-center items-center bg-black bg-opacity-50 
        group-hover:flex 
          ${activeSong?.id === song.id ? 'flex bg-black bg-opacity-70' : 'hidden'}`}
        >
          <PlayPause
            song={song}
            activeSong={activeSong}
            isPlaying={isPlaying}
            handlePause={handlePauseClick}
            handlePlay={handlePlayClick}
          />
        </div>
        <img alt="song_img" src={song.attributes?.artwork?.url} className="w-full h-full rounded-lg" />
      </div>

      <div className="mt-4 flex flex-col">
        <p className="font-semibold sm:text-base md:text-lg text-white truncate">{/* 标题太长 截断truncate */}
          <Link to={`/songs/${song?.href}`}>
            {song.attributes?.name || song.attributes?.albumName}
          </Link>
        </p>
        <p className="sm:text-xs md:text-sm truncate text-gray-300 mt-1">
          <Link to={song.attributes?.artistName ? `/artists/${song.relationships?.artists?.data?.[0]?.id}` : '/top-artists'}>
            {song.attributes?.artistName}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SongCard;