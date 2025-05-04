/**
 * Google Drive API 서비스
 * 구글 드라이브 연동 및 폴더 정보 가져오기 기능을 제공합니다.
 * Google Identity Service(GIS)를 사용한 최신 인증 방식 적용
 */

// 구글 API 클라이언트 초기화
export const loadGoogleDriveAPI = (clientId, apiKey, discoveryDocs) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('구글 API 초기화 시작...');

      // 1. 먼저 gapi 스크립트 로드 및 초기화
      loadGapiScript()
        .then(() => {
          return initializeGapiClient(apiKey, discoveryDocs);
        })
        .then(() => {
          console.log('GAPI 클라이언트 초기화 완료');
          // 2. 그다음 GIS 클라이언트 로드 및 초기화
          return loadGisScript();
        })
        .then(() => {
          // window.google이 정의된 후에 initializeGisClient 호출
          if (window.google && window.google.accounts && window.google.accounts.oauth2) {
            initializeGisClient(clientId);
            console.log('GIS 클라이언트 초기화 완료');
            resolve(true);
          } else {
            throw new Error('Google Identity Services가 로드되지 않았습니다.');
          }
        })
        .catch((error) => {
          console.error('구글 API 초기화 중 오류 발생:', error);
          reject(error);
        });
    } catch (error) {
      console.error('API 초기화 중 예외 발생:', error);
      reject(error);
    }
  });
};

// gapi 스크립트 로드
const loadGapiScript = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error('gapi 로드 실패: ' + e));
    document.body.appendChild(script);
  });
};

// GAPI 클라이언트 초기화
const initializeGapiClient = (apiKey, discoveryDocs) => {
  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        // 단계적으로 초기화
        await window.gapi.client.init({
          apiKey: apiKey,
          // 디스커버리 문서는 제외
        });
        
        // 디스커버리 문서 로드 없이 직접 드라이브 API 로드
        await window.gapi.client.load('drive', 'v3');
        
        console.log('GAPI 클라이언트 초기화 성공!');
        resolve();
      } catch (error) {
        console.error('GAPI 클라이언트 초기화 실패:', error);
        // 더 상세한 오류 정보 제공
        let errorMessage = '초기화 실패';
        if (error && error.message) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
        reject(new Error(`GAPI 초기화 실패: ${errorMessage}`));
      }
    });
  });
};

// GIS 스크립트 로드
const loadGisScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      console.log('GIS 클라이언트가 이미 로드되어 있습니다.');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // 스크립트가 로드된 후 더 길게 대기
      console.log('GIS 스크립트 로드됨, 초기화 대기 중...');
      setTimeout(() => {
        if (window.google?.accounts?.oauth2) {
          console.log('GIS 객체 확인 성공!');
          resolve();
        } else {
          console.error('Google Identity Services 객체를 찾을 수 없습니다.');
          reject(new Error('GIS 초기화 실패: 객체가 로드되지 않았습니다.'));
        }
      }, 1000); // 대기 시간을 1초로 늘림
    };
    script.onerror = (e) => reject(new Error('GIS 로드 실패: ' + e));
    document.body.appendChild(script);
  });
};

// GIS 클라이언트 초기화
const initializeGisClient = (clientId) => {
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    console.error('Google Identity Services가 로드되지 않았습니다.');
    return;
  }
  
  // 클라이언트 ID를 전역 변수에 저장
  window.clientId = clientId;
  
  try {
    // 오류 처리를 위한 시도/예외 블록 추가
    try {
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
        callback: '', // 콜백은 실제 요청 시 설정
      });
      console.log('토큰 클라이언트 초기화 완료');
    } catch (innerError) {
      console.error('토큰 클라이언트 초기화 시도 1 실패:', innerError);
      
      // 두 번째 방법으로 시도 (지연 후)
      setTimeout(() => {
        try {
          window.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
            callback: () => {}
          });
          console.log('토큰 클라이언트 재시도로 초기화 완료');
        } catch (retryError) {
          console.error('토큰 클라이언트 초기화 시도 2 실패:', retryError);
          throw retryError;
        }
      }, 1000);
    }
  } catch (error) {
    console.error('토큰 클라이언트 초기화 실패:', error);
    throw error;
  }
};

// 사용자 인증하기
export const authenticateUser = () => {
  return new Promise((resolve, reject) => {
    try {
      if (!window.tokenClient) {
        console.error('토큰 클라이언트가 초기화되지 않았습니다.');
        
        // 직접 구글 로그인 팝업 열기 시도
        const loginPopup = window.open(
          `https://accounts.google.com/o/oauth2/v2/auth?client_id=${window.clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}&response_type=token&scope=https://www.googleapis.com/auth/drive.metadata.readonly`,
          'googleLogin',
          'width=500,height=600'
        );
        
        if (loginPopup) {
          const checkPopupClosed = setInterval(() => {
            if (loginPopup.closed) {
              clearInterval(checkPopupClosed);
              // 로그인 성공한 것으로 가정
              resolve(true);
            }
          }, 500);
          
          // 1분 후 자동으로 타임아웃
          setTimeout(() => {
            clearInterval(checkPopupClosed);
            if (!loginPopup.closed) {
              loginPopup.close();
            }
            reject(new Error('로그인 타임아웃'));
          }, 60000);
        } else {
          reject(new Error('팝업 창이 차단되었습니다. 팝업 차단을 해제해 주세요.'));
        }
        
        return;
      }

      // 콜백 설정
      window.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('인증 응답 오류:', response);
          reject(new Error(response.error));
          return;
        }
        console.log('인증 성공');
        resolve(true);
      };

      // 토큰 요청
      try {
        if (window.gapi.client.getToken() === null) {
          // 사용자 동의 화면 표시
          window.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          // 이미 토큰이 있으면 소리 없이 갱신
          window.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (tokenError) {
        console.error('토큰 요청 오류:', tokenError);
        reject(tokenError);
      }
    } catch (error) {
      console.error('인증 중 오류 발생:', error);
      reject(error);
    }
  });
};

// 로그아웃
export const signOut = () => {
  return new Promise((resolve) => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          window.gapi.client.setToken('');
          resolve(true);
        });
      } else {
        // google 객체가 없으면 간단히 토큰만 제거
        window.gapi.client.setToken('');
        resolve(true);
      }
    } else {
      resolve(true);
    }
  });
};

// 폴더 내용 가져오기
export const getFolderContents = async (folderId) => {
  try {
    // 폴더 자체 정보 가져오기
    const folderResponse = await window.gapi.client.drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true
    });
    
    const folderInfo = folderResponse.result;
    
    // 폴더 내용 가져오기
    let query = `'${folderId}' in parents and trashed = false`;
    const response = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, iconLink)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1000
    });
    
    const files = response.result.files || [];
    
    // 폴더 자체 정보와 내용 합치기
    return [folderInfo, ...files];
  } catch (error) {
    console.error('폴더 내용을 가져오는 중 오류 발생:', error);
    throw error;
  }
};

// 파일 상세 정보 가져오기
export const getFileDetails = async (fileId) => {
  try {
    const response = await window.gapi.client.drive.files.get({
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