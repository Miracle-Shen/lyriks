import {FaPauseCircle, FaPlayCircle} from 'react-icons/fa';

const PlayPause = ({song, isPlaying, activeSong,handlePause,handlePlay}) => (
  isPlaying && activeSong?.id === song?.id) ? (
  <FaPauseCircle
    size={35}
    className="text-gray-300"
    onClick={(event) => {
      event.stopPropagation();
      handlePause();
    }}
  />
) : (
  <FaPlayCircle
    size={35}
    className="text-gray-300"
    onClick={(event) => {
      event.stopPropagation();
      handlePlay();
    }}
  />
);

export default PlayPause;
 
