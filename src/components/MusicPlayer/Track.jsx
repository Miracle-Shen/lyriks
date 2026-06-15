import React from 'react';
import { Link } from 'react-router-dom';

const Track = ({ isPlaying, isActive, activeSong }) => (
  <div className="flex-1 flex items-center justify-start">
    <Link
      to="/play"
      aria-label="进入播放详情页"
      className={`${isPlaying && isActive ? 'animate-[spin_3s_linear_infinite]' : ''} hidden sm:block h-16 w-16 mr-4 rounded-full focus:outline-none focus:ring-2 focus:ring-fuchsia-300`}
    >
      <img src={activeSong?.attributes?.artwork?.url} alt="cover art" className="rounded-full" />
    </Link>
    <div className="w-[50%]">
      <p className="truncate text-white font-bold text-lg">
        {activeSong?.attributes?.name ? activeSong?.attributes?.name : 'No active Song'}
      </p>
      <p className="truncate text-gray-300">
        {activeSong?.attributes?.artistName ? activeSong?.attributes?.artistName : 'No active Song'}
      </p>
    </div>
  </div>
);

export default Track;
