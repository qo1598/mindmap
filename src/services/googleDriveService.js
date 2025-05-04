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
          return new Promise((resolveGapi, rejectGapi) => {
            try {
              // 단순화된 방식으로 GAPI 초기화
              window.gapi.load('client:auth2', async () => {
                try {
                  console.log('GAPI 직접 초기화 시도...');
                  await window.gapi.client.init({
                    apiKey: apiKey,
                    clientId: clientId,
                    discoveryDocs: discoveryDocs,
                    scope: 'https://www.googleapis.com/auth/drive.metadata.readonly'
                  });
                  console.log('GAPI 직접 초기화 성공!');
                  resolveGapi();
                } catch (err) {
                  console.warn('GAPI 직접 초기화 실패, 대체 방법 시도:', err);
                  // 백업 방식으로 초기화 시도
                  window.gapi.client.init({
                    apiKey: apiKey
                  }).then(() => {
                    window.gapi.client.load('drive', 'v3')
                      .then(() => {
                        console.log('대체 방식으로 드라이브 API 로드 성공!');
                        resolveGapi();
                      })
                      .catch((loadErr) => {
                        console.error('드라이브 API 로드 실패:', loadErr);
                        rejectGapi(loadErr);
                      });
                  }).catch((initErr) => {
                    console.error('GAPI 클라이언트 초기화 실패:', initErr);
                    rejectGapi(initErr);
                  });
                }
              });
            } catch (loadErr) {
              console.error('GAPI 로드 실패:', loadErr);
              rejectGapi(loadErr);
            }
          });
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
            console.warn('GIS 객체가 없지만 GAPI 인증으로 계속 진행합니다');
            resolve(true);
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
        console.log('GAPI 초기화 시작...');
        
        // 간소화된 방식으로 API 키만 설정
        await window.gapi.client.init({
          apiKey: apiKey,
        });
        
        console.log('API 키 설정 완료, 드라이브 API 직접 로드 시도');
        
        // 디스커버리 문서 없이 직접 드라이브 API 로드
        await window.gapi.client.load('drive', 'v3');
        console.log('드라이브 API 로드 성공!');
        
        resolve();
      } catch (error) {
        console.error('GAPI 클라이언트 초기화 실패:', error);
        // 오류 정보 제공 강화
        let errorMessage = '초기화 실패';
        if (error && error.details) {
          errorMessage = error.details;
        } else if (error && error.message) {
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
      console.log('인증 시도 - auth2 확인');
      
      // 안전하게 gapi.auth2 로드
      window.gapi.load('client:auth2', async () => {
        try {
          console.log('auth2 로드 완료');
          
          // auth2 초기화 확인
          if (!window.gapi.auth2.getAuthInstance()) {
            console.log('auth2 인스턴스 없음, 초기화 시도...');
            await window.gapi.auth2.init({
              client_id: window.clientId || '1033835493377-4gk2e80bhgsr51j6f9j9vo5mp7k7j1ad.apps.googleusercontent.com',
              scope: 'https://www.googleapis.com/auth/drive.metadata.readonly'
            });
            console.log('auth2 초기화 완료');
          }
          
          // 로그인 시도
          console.log('로그인 시도...');
          const authInstance = window.gapi.auth2.getAuthInstance();
          const isSignedIn = authInstance.isSignedIn.get();
          
          if (isSignedIn) {
            console.log('이미 로그인 되어 있음');
            resolve(true);
            return;
          }
          
          try {
            console.log('로그인 프로세스 시작');
            await authInstance.signIn();
            console.log('로그인 성공');
            resolve(true);
          } catch (signInError) {
            console.error('로그인 실패:', signInError);
            reject(new Error('로그인 프로세스 중 오류: ' + (signInError.error || signInError.message || '알 수 없는 오류')));
          }
        } catch (authError) {
          console.error('Auth2 초기화 오류:', authError);
          reject(new Error('인증 초기화 중 오류: ' + (authError.error || authError.message || '알 수 없는 오류')));
        }
      });
    } catch (error) {
      console.error('인증 중 예외 발생:', error);
      reject(new Error('인증 중 예외 발생: ' + (error.message || '알 수 없는 오류')));
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