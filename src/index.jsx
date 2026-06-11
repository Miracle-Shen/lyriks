import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';

import './index.css';
import App from './App';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import { store } from './redux/store';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AudioPlayerProvider>
        <Router>
          <App />
        </Router>
      </AudioPlayerProvider>
    </Provider>
  </React.StrictMode>,
);
