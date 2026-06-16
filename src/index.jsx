import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';

import './index.css';
import App from './App';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import { EmotionMascotProvider } from './features/emotionMascot/context/EmotionMascotContext';
import { store } from './redux/store';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AudioPlayerProvider>
        <EmotionMascotProvider>
          <Router>
            <App />
          </Router>
        </EmotionMascotProvider>
      </AudioPlayerProvider>
    </Provider>
  </React.StrictMode>,
);
