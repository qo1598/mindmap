import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MindMap from './components/MindMap';
import { Box, Button, CircularProgress, Typography, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import { gapi } from 'gapi-script';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // 5초 단위
  const refreshTimerRef = useRef(null);
  const [oauthConfig, setOauthConfig] = useState(null);

  // 고정된 값 사용
  const CLIENT_ID = '362381193698-ubvpejukf8u2e8vkq1nlkeofl83q7l56.apps.googleusercontent.com';
  const API_KEY = 'AIzaSyBzDqaWmNVJ8-0c-m_niBBOMz-dgAkQV70';
  const ROOT_FOLDER_ID = '1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9';

  // OAuth 구성 파일 로드
  useEffect(() => {
    const loadOAuthConfig = async () => {
      try {
        const response = await fetch('/credentials/oauth-config.json');
        if (response.ok) {
          const config = await response.json();
          console.log('OAuth 구성 로드됨:', config);
          setOauthConfig(config);
        } else {
          console.error('OAuth 구성 로드 실패:', response.status);
        }
      } catch (err) {
        console.error('OAuth 구성 파일 로드 중 오류 발생:', err);
      }
    };
    
    loadOAuthConfig();
  }, []);

  // Google API 초기화
  useEffect(() => {
    const initGapi = async () => {
      try {
        // GAPI가 이미 로드되어 있는지 확인
        if (!window.gapi) {
          console.error('GAPI가 로드되지 않았습니다. 페이지를 새로고침하세요.');
          setError('Google API를 로드할 수 없습니다. 페이지를 새로고침하세요.');
          setOpenSnackbar(true);
          return;
        }

        // client:auth2 모듈 로드
        await new Promise((resolve) => {
          window.gapi.load('client:auth2', resolve);
        });

        // 클라이언트 초기화
        console.log('Google API 클라이언트 초기화 중...');
        await window.gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        });
        
        console.log('Google API 클라이언트 초기화 완료');

        // 인증 인스턴스 가져오기
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          // 로그인 상태 감지 리스너
          authInstance.isSignedIn.listen(updateSigninStatus);
          
          // 초기 로그인 상태 설정
          updateSigninStatus(authInstance.isSignedIn.get());
        } else {
          setError('Google 인증 인스턴스를 찾을 수 없습니다.');
          setOpenSnackbar(true);
        }
      } catch (err) {
        console.error('Google API 초기화 오류:', err);
        setError(`Google API 초기화 오류: ${err.message || '알 수 없는 오류'}`);
        setOpenSnackbar(true);
      }
    };

    // 스크립트 로드 후 지연 초기화 (500ms)
    const timeoutId = setTimeout(() => {
      initGapi();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // 자동 새로고침 설정
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

  const updateSigninStatus = (isSignedIn) => {
    console.log('로그인 상태 업데이트:', isSignedIn);
    setIsSignedIn(isSignedIn);
    
    if (isSignedIn) {
      loadFolderData();
    }
  };

  const handleSignIn = () => {
    setIsLoading(true);
    try {
      console.log('로그인 시도...');

      // 디버깅 정보 출력
      console.log('구글 클라이언트 ID:', CLIENT_ID);
      console.log('현재 URL 오리진:', window.location.origin);

      // 인증 인스턴스 확인
      if (!window.gapi || !window.gapi.auth2) {
        throw new Error('Google 인증(auth2)이 초기화되지 않았습니다. 페이지를 새로고침해 주세요.');
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        throw new Error('Google 인증 인스턴스를 찾을 수 없습니다.');
      }
      
      const signInOptions = {
        ux_mode: 'popup', // 팝업 모드 사용
        prompt: 'consent', // 항상 동의 화면 표시
        redirect_uri: window.location.origin
      };
      
      console.log('로그인 옵션:', signInOptions);
      
      // 팝업 로그인 시도
      authInstance.signIn(signInOptions)
        .then((response) => {
          console.log('로그인 성공');
          console.log('로그인 응답:', response);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('로그인 오류:', error);
          console.error('오류 상세:', JSON.stringify(error, null, 2));
          
          // 특정 오류 처리
          if (error.error === 'popup_closed_by_user') {
            setError('로그인 팝업이 닫혔습니다. 다시 시도해 주세요.');
          } else if (error.error === 'access_denied') {
            setError('액세스가 거부되었습니다. 계정 권한을 확인해 주세요.');
          } else {
            setError('로그인 중 오류가 발생했습니다: ' + (error.message || error.error || '알 수 없는 오류'));
          }
          
          setOpenSnackbar(true);
          setIsLoading(false);
        });
    } catch (error) {
      console.error('로그인 시도 중 예외 발생:', error);
      setError('로그인 시도 중 오류: ' + error.message);
      setOpenSnackbar(true);
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

  // 폴더 내용 가져오기
  const getFolderContents = async (folderId) => {
    try {
      console.log('폴더 내용 가져오기 시작:', folderId);
      
      // 폴더 자체 정보 가져오기
      const folderResponse = await gapi.client.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType',
        supportsAllDrives: true
      });
      
      console.log('폴더 정보 가져오기 성공:', folderResponse.result.name);
      const folderInfo = folderResponse.result;
      
      // 폴더 내용 가져오기
      let query = `'${folderId}' in parents and trashed = false`;
      console.log('폴더 내용 쿼리:', query);
      
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, iconLink)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000
      });
      
      const files = response.result.files || [];
      console.log('폴더 내용 가져오기 성공:', files.length, '개 항목');
      
      // 폴더 자체 정보와 내용 합치기
      return [folderInfo, ...files];
    } catch (error) {
      console.error('폴더 내용을 가져오는 중 오류 발생:', error);
      if (error.status === 403) {
        console.error('접근 권한 오류: 해당 폴더에 접근할 권한이 없습니다.');
        throw new Error('접근 권한 오류: 해당 폴더에 접근할 권한이 없습니다. 관리자에게 공유 권한을 요청하세요.');
      } else {
        throw error;
      }
    }
  };

  // 파일 상세 정보 가져오기 (MindMap 컴포넌트에서 사용)
  window.getFileDetails = async (fileId) => {
    try {
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, iconLink, webViewLink, webContentLink, thumbnailLink, size, modifiedTime, createdTime, exportLinks',
        supportsAllDrives: true
      });
      
      return response.result;
    } catch (error) {
      console.error('파일 상세 정보를 가져오는 중 오류 발생:', error);
      throw error;
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

  const startGapiClient = async () => {
    try {
      console.log('GAPI 클라이언트 초기화 중...');
      console.log('API 키:', API_KEY);
      console.log('클라이언트 ID:', CLIENT_ID);
      console.log('현재 URL 오리진:', window.location.origin);
      
      // 클라이언트 초기화 옵션
      const initOptions = {
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      };
      
      console.log('클라이언트 초기화 옵션:', initOptions);
      
      // 클라이언트 초기화 시도
      await gapi.client.init(initOptions);
      
      console.log('gapi 클라이언트 초기화 완료');
      
      // 인증 인스턴스 가져오기
      const authInstance = gapi.auth2.getAuthInstance();
      
      if (authInstance) {
        console.log('Auth 인스턴스 확인 성공');
        const isSignedIn = authInstance.isSignedIn.get();
        console.log('현재 로그인 상태:', isSignedIn ? '로그인됨' : '로그인되지 않음');
        
        // 로그인 상태 변경 리스너 등록
        authInstance.isSignedIn.listen((isSignedIn) => {
          console.log('로그인 상태 변경:', isSignedIn ? '로그인됨' : '로그인되지 않음');
          updateSigninStatus(isSignedIn);
        });
        
        // 초기 로그인 상태 설정
        updateSigninStatus(isSignedIn);
      } else {
        console.error('Auth 인스턴스를 가져올 수 없습니다.');
        setError('Google 인증 초기화 중 오류가 발생했습니다: Auth 인스턴스를 가져올 수 없습니다.');
        setOpenSnackbar(true);
      }
    } catch (err) {
      console.error('Google API 초기화 중 오류 발생:', err);
      setError(`Google API 초기화 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
      setOpenSnackbar(true);
    }
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