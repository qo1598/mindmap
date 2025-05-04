import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { gapi } from 'gapi-script';

// GAPI 초기화 로깅
window.onGapiLoad = () => {
  console.log('GAPI 스크립트가 index.js에서 로드됨');
};

// GAPI를 명시적으로 전역에 노출
window.gapi = gapi;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 