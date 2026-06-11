import { useSelector } from 'react-redux';
import { Route, Routes } from 'react-router-dom';

import { Sidebar, MusicPlayer, FloatingBeatMascot } from './components';
import { ArtistDetails, TopArtists, AroundYou, Discover, Search, SongDetails, TopCharts } from './pages';

const App = () => {
  const { activeSong } = useSelector((state) => state.player);

  return (
    <div className="cinematic-app-shell relative flex min-h-screen overflow-hidden">
      <FloatingBeatMascot />
      <Sidebar />
      <div className="cinematic-content-surface flex-1 flex flex-col">
        <div className="relative z-[1] px-6 h-screen overflow-y-scroll hide-scrollbar flex flex-col-reverse">
          <div className="h-fit">
            <Routes>
              <Route path="/" element={<Discover />} />
              <Route path="/top-artists" element={<TopArtists />} />
              <Route path="/top-charts" element={<TopCharts />} />
              <Route path="/around-you" element={<AroundYou />} />
              <Route path="/artists/:id" element={<ArtistDetails />} />
              <Route path="/songs/:songid" element={<SongDetails />} />
              <Route path="/search/:searchTerm" element={<Search />} />
            </Routes>
          </div>
        </div>
      </div>

      {activeSong?.attributes?.name && (
        <div className="cinematic-player-bar absolute h-28 bottom-0 left-0 right-0 flex animate-slideup rounded-t-3xl z-10">
          <MusicPlayer />
        </div>
      )}
    </div>
  );
};

export default App;
