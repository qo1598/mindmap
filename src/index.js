import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { gapi } from 'gapi-script';

// 구글 API 스크립트 동적 로드
const loadGoogleScript = () => {
  // gapi 스크립트 로드
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.async = true;
  gapiScript.defer = true;
  document.body.appendChild(gapiScript);

  // gsi 클라이언트 로드 (최신 구글 인증용)
  const gsiScript = document.createElement('script');
  gsiScript.src = 'https://accounts.google.com/gsi/client';
  gsiScript.async = true;
  gsiScript.defer = true;
  document.body.appendChild(gsiScript);
};

// 스크립트 로드
loadGoogleScript();

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