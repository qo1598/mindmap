import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import MindMap from './components/MindMap';
import { Box, Button, CircularProgress, Typography, Snackbar, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Paper, Card, CardContent } from '@mui/material';
import { initPublicGoogleAPI, getPublicFolderStructure, checkFolderAccess, getPublicFileDetails, extractIdFromDriveLink } from './services/publicDriveService';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [folderIdInput, setFolderIdInput] = useState('');
  const [folderAccessInfo, setFolderAccessInfo] = useState(null);
  const [hasSelectedFolder, setHasSelectedFolder] = useState(false);

  // 초기에는 폴더 ID를 설정하지 않음 (로컬 스토리지 무시)
  const [rootFolderId, setRootFolderId] = useState(null);

  // 폴더 ID가 변경될 때 로컬 스토리지에 저장
  useEffect(() => {
    if (rootFolderId) {
      localStorage.setItem('publicFolderId', rootFolderId);
      setHasSelectedFolder(true);
    } else {
      localStorage.removeItem('publicFolderId');
      setHasSelectedFolder(false);
    }
  }, [rootFolderId]);

  // 초기 폴더 접근 확인
  const checkInitialFolderAccess = useCallback(async () => {
    if (!rootFolderId) return;
    
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
  }, [rootFolderId]);

  // 공개 폴더 데이터 로드
  const loadPublicFolderData = useCallback(async (isRefresh = false, folderId = null) => {
    const targetFolderId = folderId || rootFolderId;
    if (!targetFolderId) return;
    
    if (!isRefresh) {
      setIsLoading(true);
    }
    
    try {
      console.log(`공개 폴더 데이터 로드 시작: ${targetFolderId}`);
      
      const folderStructure = await getPublicFolderStructure(targetFolderId, 0, 3);
      
      if (folderStructure) {
        setData(folderStructure);
        console.log('공개 폴더 데이터 로드 완료');
        
        if (isRefresh) {
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
        
        // MindMap에서 사용할 수 있도록 전역 함수 설정
        window.getFileDetails = getPublicFileDetails;
        
        setIsInitialized(true);
        console.log('공개 Google API 초기화 완료');
        
        // 저장된 폴더 ID가 있는 경우에만 로드
        if (rootFolderId) {
          await checkInitialFolderAccess();
          await loadPublicFolderData();
        }
        
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
  }, [checkInitialFolderAccess, loadPublicFolderData, rootFolderId]);

  // 구글 드라이브 선택 다이얼로그 열기
  const handleSelectDrive = () => {
    setOpenFolderDialog(true);
    setFolderIdInput(rootFolderId || '');
  };

  const handleFolderDialogClose = () => {
    setOpenFolderDialog(false);
    setFolderIdInput('');
  };

  // 폴더 ID 입력 변경 시 자동 ID 추출
  const handleFolderIdInputChange = (event) => {
    const inputValue = event.target.value;
    setFolderIdInput(inputValue);
    
    // 실시간으로 ID 추출 시도
    const extractedId = extractIdFromDriveLink(inputValue);
    if (extractedId && extractedId !== inputValue && inputValue.includes('drive.google.com')) {
      // Google Drive 링크인 경우 추출된 ID로 자동 변경
      setTimeout(() => {
        setFolderIdInput(extractedId);
      }, 500);
    }
  };

  const handleFolderIdSubmit = async () => {
    if (folderIdInput.trim()) {
      // 링크에서 ID 추출 시도
      const extractedId = extractIdFromDriveLink(folderIdInput.trim());
      
      if (extractedId) {
        setRootFolderId(extractedId);
        setOpenFolderDialog(false);
        setFolderIdInput('');
        
        // 새 폴더 접근 확인 및 데이터 로드
        setIsLoading(true);
        try {
          const accessInfo = await checkFolderAccess(extractedId);
          setFolderAccessInfo(accessInfo);
          
          if (accessInfo.accessible) {
            // extractedId를 직접 전달하여 state 업데이트 지연 문제 해결
            await loadPublicFolderData(false, extractedId);
          } else {
            setError('폴더에 접근할 수 없습니다. 폴더가 공개로 설정되었는지 확인해주세요.');
            setOpenSnackbar(true);
          }
        } catch (err) {
          setError(err.message || '폴더 접근에 실패했습니다.');
          setOpenSnackbar(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setError('유효한 Google Drive 폴더 ID 또는 링크를 입력해주세요.');
        setOpenSnackbar(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleRefreshNow = () => {
    if (rootFolderId) {
      loadPublicFolderData(true);
    }
  };

  // 사용 방법 컴포넌트
  const WelcomeScreen = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        p: 4
      }}
    >
      <Card sx={{ maxWidth: 600, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
            🧠 Google Drive 마인드맵
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 3, color: '#666' }}>
            Google Drive 폴더를 아름다운 마인드맵으로 시각화하세요
          </Typography>
          
          <Box sx={{ textAlign: 'left', mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              📋 사용 방법
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>1단계:</strong> Google Drive에서 폴더를 공개로 설정
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, ml: 2, color: '#666' }}>
              • 폴더 우클릭 → "공유" → "링크가 있는 모든 사용자"로 설정
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>2단계:</strong> 우측 상단 "구글 드라이브 선택" 버튼 클릭
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>3단계:</strong> 공유 링크 붙여넣기 또는 폴더 ID 입력
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, ml: 2, color: '#666' }}>
              • 예: https://drive.google.com/drive/folders/1ABC...
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>4단계:</strong> 마인드맵으로 시각화된 폴더 구조 확인
            </Typography>
          </Box>
          
          <Button 
            variant="contained" 
            size="large"
            startIcon={<DriveFileRenameOutlineIcon />}
            onClick={handleSelectDrive}
            sx={{ 
              fontSize: '1.1rem',
              py: 1.5,
              px: 4,
              borderRadius: 3
            }}
          >
            구글 드라이브 선택하기
          </Button>
        </CardContent>
      </Card>
    </Box>
  );

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
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e9ecef'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          🧠 Google Drive 마인드맵
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {folderAccessInfo && hasSelectedFolder && (
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
            startIcon={<DriveFileRenameOutlineIcon />}
            onClick={handleSelectDrive}
            sx={{ minWidth: 'auto' }}
          >
            구글 드라이브 선택
          </Button>
          
          {hasSelectedFolder && (
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={handleRefreshNow}
              disabled={isLoading}
            >
              새로고침
            </Button>
          )}
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
              Google Drive 폴더에 접근 중입니다
            </Typography>
          </Box>
        ) : data ? (
          <MindMap data={data} enableDownload={true} />
        ) : (
          <WelcomeScreen />
        )}
      </Box>

      {/* 구글 드라이브 선택 다이얼로그 */}
      <Dialog open={openFolderDialog} onClose={handleFolderDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DriveFileRenameOutlineIcon color="primary" />
            구글 드라이브 선택
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Google Drive 공유 링크를 붙여넣거나 폴더 ID를 직접 입력하세요.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Google Drive 링크 또는 폴더 ID"
            value={folderIdInput}
            onChange={handleFolderIdInputChange}
            placeholder="https://drive.google.com/drive/folders/... 또는 1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9"
            sx={{ mb: 3 }}
            multiline
            rows={2}
          />
          
          <Card sx={{ backgroundColor: '#f8f9fa', mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                🔗 링크 사용법:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Google Drive에서 "공유" → "링크 복사"한 후 여기에 붙여넣기
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ backgroundColor: '#fff3cd' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                📌 폴더 공개 설정:
              </Typography>
              <Typography variant="body2" component="div">
                1. Google Drive에서 폴더를 우클릭<br/>
                2. "공유" 선택<br/>
                3. "링크가 있는 모든 사용자"로 설정<br/>
                4. 권한을 "뷰어"로 설정
              </Typography>
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa' }}>
          <Button onClick={handleFolderDialogClose}>취소</Button>
          <Button onClick={handleFolderIdSubmit} variant="contained">
            선택하기
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