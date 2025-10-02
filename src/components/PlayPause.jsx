import {FaPauseCircle,FaPlayCircle} from 'react-icons/fa';

const PlayPause = ({isPlaying, activeSong,song,handlePause,handlePlay}) => (
  isPlaying && activeSong.title === song.title) ? (
  <FaPauseCircle className="play-pause" onClick={handlePause} />
) : (
  <FaPlayCircle className="play-pause" onClick={handlePlay} />
);

export default PlayPause;
