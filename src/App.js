import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import MindMap from './components/MindMap';
import { Box, Button, CircularProgress, Typography, Snackbar, Alert, Switch, FormControlLabel, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Paper } from '@mui/material';
import { initPublicGoogleAPI, getPublicFolderStructure, checkFolderAccess } from './services/publicDriveService';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 30초 단위로 변경
  const refreshTimerRef = useRef(null);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [folderIdInput, setFolderIdInput] = useState('');
  const [folderAccessInfo, setFolderAccessInfo] = useState(null);

  // 기본 공개 폴더 ID (여기에 공개로 설정한 폴더 ID를 입력하세요)
  const [rootFolderId, setRootFolderId] = useState(() => {
    return localStorage.getItem('publicFolderId') || '1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9';
  });

  // 폴더 ID가 변경될 때 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('publicFolderId', rootFolderId);
  }, [rootFolderId]);

  // Google API 초기화 (공개 접근)
  useEffect(() => {
    const initPublicAPI = async () => {
      try {
        setIsLoading(true);
        console.log('공개 Google API 초기화 중...');
        
        // GAPI 로드 대기
        if (!window.gapi) {
          console.log('GAPI 로드 대기 중...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await initPublicGoogleAPI();
        setIsInitialized(true);
        console.log('공개 Google API 초기화 완료');
        
        // 폴더 접근 확인
        await checkInitialFolderAccess();
        
        // 초기 데이터 로드
        await loadPublicFolderData();
        
      } catch (err) {
        console.error('공개 API 초기화 오류:', err);
        setError(`API 초기화 실패: ${err.message}`);
        setOpenSnackbar(true);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(initPublicAPI, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  // 자동 새로고침 설정
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (autoRefresh && isInitialized) {
      refreshTimerRef.current = setInterval(() => {
        console.log(`${refreshInterval}초마다 데이터 새로고침 중...`);
        loadPublicFolderData(true);
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isInitialized, rootFolderId]);

  // 초기 폴더 접근 확인
  const checkInitialFolderAccess = async () => {
    try {
      const accessInfo = await checkFolderAccess(rootFolderId);
      setFolderAccessInfo(accessInfo);
      
      if (!accessInfo.accessible) {
        setError('폴더에 접근할 수 없습니다. 폴더가 공개로 설정되었는지 확인해주세요.');
        setOpenSnackbar(true);
      }
    } catch (err) {
      console.error('폴더 접근 확인 실패:', err);
    }
  };

  // 공개 폴더 데이터 로드
  const loadPublicFolderData = async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }
    
    try {
      console.log(`공개 폴더 데이터 로드 시작: ${rootFolderId}`);
      
      const folderStructure = await getPublicFolderStructure(rootFolderId, 0, 3);
      
      if (folderStructure) {
        setData(folderStructure);
        console.log('공개 폴더 데이터 로드 완료');
        
        if (isRefresh) {
          // 새로고침 성공 알림
          setError('데이터가 새로고침되었습니다.');
          setOpenSnackbar(true);
        }
      } else {
        throw new Error('폴더 구조를 가져올 수 없습니다.');
      }
      
    } catch (err) {
      console.error('공개 폴더 데이터 로드 실패:', err);
      setError(err.message || '데이터 로드에 실패했습니다.');
      setOpenSnackbar(true);
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
    }
  };

  // 폴더 ID 변경
  const handleFolderIdChange = () => {
    setOpenFolderDialog(true);
    setFolderIdInput(rootFolderId);
  };

  const handleFolderDialogClose = () => {
    setOpenFolderDialog(false);
    setFolderIdInput('');
  };

  const handleFolderIdSubmit = async () => {
    if (folderIdInput.trim() && folderIdInput !== rootFolderId) {
      setRootFolderId(folderIdInput.trim());
      setOpenFolderDialog(false);
      setFolderIdInput('');
      
      // 새 폴더 접근 확인 및 데이터 로드
      await checkInitialFolderAccess();
      await loadPublicFolderData();
    } else {
      setOpenFolderDialog(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleAutoRefreshChange = (event) => {
    setAutoRefresh(event.target.checked);
  };

  const handleRefreshNow = () => {
    loadPublicFolderData(true);
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          공개 Google Drive 마인드맵
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {folderAccessInfo && (
            <Typography variant="body2" color="text.secondary">
              {folderAccessInfo.accessible ? 
                `📁 ${folderAccessInfo.name || '폴더'}` : 
                '❌ 접근 불가'
              }
            </Typography>
          )}
          
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleFolderIdChange}
            sx={{ minWidth: 'auto' }}
          >
            폴더 변경
          </Button>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={handleAutoRefreshChange}
                size="small"
              />
            }
            label={`자동새로고침 (${refreshInterval}초)`}
            sx={{ ml: 1 }}
          />
          
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleRefreshNow}
            disabled={isLoading}
          >
            새로고침
          </Button>
        </Box>
      </Paper>

      {/* 메인 콘텐츠 */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {isLoading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column'
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {!isInitialized ? 'API 초기화 중...' : '데이터 로드 중...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              OAuth 로그인 없이 공개 폴더에 접근 중입니다
            </Typography>
          </Box>
        ) : data ? (
          <MindMap data={data} enableDownload={true} />
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" color="text.secondary">
              데이터를 불러올 수 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              폴더가 "링크가 있는 모든 사용자"로 공개 설정되었는지 확인해주세요
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => loadPublicFolderData()}
            >
              다시 시도
            </Button>
          </Box>
        )}
      </Box>

      {/* 폴더 ID 변경 다이얼로그 */}
      <Dialog open={openFolderDialog} onClose={handleFolderDialogClose}>
        <DialogTitle>공개 폴더 ID 변경</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            "링크가 있는 모든 사용자"로 공개 설정된 Google Drive 폴더의 ID를 입력하세요.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="폴더 ID"
            value={folderIdInput}
            onChange={(e) => setFolderIdInput(e.target.value)}
            placeholder="예: 1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9"
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            📌 사용법:<br/>
            1. Google Drive에서 폴더를 우클릭<br/>
            2. "공유" 선택<br/>
            3. "링크가 있는 모든 사용자"로 설정<br/>
            4. 공유 링크에서 폴더 ID 복사
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFolderDialogClose}>취소</Button>
          <Button onClick={handleFolderIdSubmit} variant="contained">
            적용
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={error?.includes('새로고침') ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App; 