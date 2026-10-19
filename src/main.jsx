import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { NowProvider } from './hooks/useNow.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <NowProvider>
          <App />
        </NowProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
