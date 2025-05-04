import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MindMap from './components/MindMap';
import { Box, Button, CircularProgress, Typography, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import { loadGoogleDriveAPI, authenticateUser, getFolderContents } from './services/googleDriveService';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // 5초 단위로 변경
  const refreshTimerRef = useRef(null);

  // 하드코딩된 ID와 키를 사용합니다 (환경 변수가 제대로 작동하지 않을 경우를 대비)
  const CLIENT_ID = '1033835493377-4gk2e80bhgsr51j6f9j9vo5mp7k7j1ad.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyBVxLt7aRqNmDRL6NLq2CRSVKrPb3IeYIw';
  const ROOT_FOLDER_ID = '1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9';
  const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

  useEffect(() => {
    const initializeGoogleAPI = async () => {
      try {
        console.log('Google API 초기화 중...');
        console.log('사용 중인 CLIENT_ID:', CLIENT_ID);
        console.log('사용 중인 API_KEY:', API_KEY);
        console.log('사용 중인 DISCOVERY_DOCS:', DISCOVERY_DOCS);
        
        // 환경에 따라 다른 초기화 방법 사용
        // 배포 환경에서는 fallback 방법도 시도
        try {
          const initialized = await loadGoogleDriveAPI(CLIENT_ID, API_KEY, DISCOVERY_DOCS);
          console.log('Google API 초기화 완료:', initialized);
        } catch (initError) {
          console.warn('표준 초기화 실패, 대체 방법 시도:', initError);
          
          // fallback: 단순화된 방식으로 재시도
          await new Promise((resolve) => {
            window.gapi.load('client:auth2', () => {
              window.gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: 'https://www.googleapis.com/auth/drive.metadata.readonly'
              }).then(() => {
                console.log('Google API 대체 초기화 완료');
                resolve();
              }).catch((err) => {
                console.error('Google API 대체 초기화 실패:', err);
                resolve(); // 계속 진행
              });
            });
          });
        }
        
        // 안전하게 토큰 존재 여부 확인
        const tokenExists = window.gapi && 
                          window.gapi.client && 
                          typeof window.gapi.client.getToken === 'function' && 
                          window.gapi.client.getToken() !== null;
                          
        console.log('인증 토큰 존재 여부:', tokenExists);
        setIsSignedIn(tokenExists);
        
        if (tokenExists) {
          loadFolderData();
        }
      } catch (err) {
        console.error('API 초기화 오류:', err);
        setError('Google API 초기화 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
        setOpenSnackbar(true);
      }
    };
    
    initializeGoogleAPI();

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // 자동 새로고침 설정 변경 시 타이머 설정
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (autoRefresh && isSignedIn) {
      refreshTimerRef.current = setInterval(() => {
        console.log(`${refreshInterval}초마다 데이터 새로고침 중...`);
        loadFolderData(true);
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isSignedIn]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      console.log('로그인 시도...');
      const success = await authenticateUser();
      console.log('로그인 결과:', success);
      setIsSignedIn(success);
      if (success) {
        loadFolderData();
      }
    } catch (err) {
      console.error('로그인 중 오류 발생:', err);
      // 오류 메시지 처리 개선
      let errorMessage = '인증 중 오류가 발생했습니다';
      if (err && err.message) {
        errorMessage += ': ' + err.message;
      } else if (err && typeof err === 'object') {
        errorMessage += ': ' + JSON.stringify(err);
      } else if (err) {
        errorMessage += ': ' + err;
      } else {
        errorMessage += ': 알 수 없는 오류';
      }
      setError(errorMessage);
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderData = async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }
    
    try {
      const rootFolderData = await fetchFolderStructure(ROOT_FOLDER_ID);
      setData(rootFolderData);
      
      if (isRefresh) {
        console.log('폴더 데이터가 새로고침되었습니다.');
      }
    } catch (err) {
      console.error('폴더 데이터 로드 오류:', err);
      if (!isRefresh) {
        setError('폴더 데이터를 불러오는 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
        setOpenSnackbar(true);
      }
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
    }
  };

  const fetchFolderStructure = async (folderId, depth = 0, maxDepth = 3) => {
    if (depth > maxDepth) return null;

    try {
      const folderContents = await getFolderContents(folderId);
      const folderInfo = folderContents.find(item => item.id === folderId) || {
        id: folderId,
        name: depth === 0 ? '루트 폴더' : '폴더',
        mimeType: 'application/vnd.google-apps.folder'
      };

      const children = [];
      for (const item of folderContents) {
        if (item.id === folderId) continue;

        let child = {
          id: item.id,
          name: item.name,
          type: item.mimeType.includes('folder') ? 'folder' : 'file',
          mimeType: item.mimeType
        };

        if (item.mimeType.includes('folder')) {
          const childData = await fetchFolderStructure(item.id, depth + 1, maxDepth);
          if (childData && childData.children) {
            child.children = childData.children;
          }
        }

        children.push(child);
      }

      return {
        id: folderInfo.id,
        name: folderInfo.name,
        type: 'folder',
        mimeType: folderInfo.mimeType,
        children: children
      };
    } catch (err) {
      console.error('폴더 구조를 가져오는 중 오류 발생했습니다:', err);
      throw err;
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleAutoRefreshChange = (event) => {
    setAutoRefresh(event.target.checked);
  };

  const handleRefreshNow = () => {
    loadFolderData(true);
  };

  return (
    <Box className="App">
      {!isSignedIn ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            backgroundColor: '#f5f5f5' 
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            구글 드라이브 마인드맵
          </Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            구글 드라이브 폴더를 시각적인 마인드맵으로 표시합니다
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSignIn}
            disabled={isLoading}
            sx={{ 
              borderRadius: '20px',
              padding: '10px 20px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)'
              }
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : '구글 계정으로 로그인'}
          </Button>
        </Box>
      ) : (
        <Box className="mindmap-wrapper" sx={{ height: '100vh', width: '100vw' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : data ? (
            <MindMap data={data} enableDownload={true} />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>
                데이터를 불러오고 있는 중입니다...
              </Typography>
              <CircularProgress sx={{ ml: 2 }} />
            </Box>
          )}
        </Box>
      )}
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App; 