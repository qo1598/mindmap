/**
 * 공개 Google Drive API 서비스
 * OAuth 없이 공개 폴더에 접근하는 기능을 제공합니다.
 */

const API_KEY = 'AIzaSyBzDqaWmNVJ8-0c-m_niBBOMz-dgAkQV70';

// Google API 초기화 (공개 접근용)
export const initPublicGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
          });
          console.log('공개 Google API 초기화 완료');
          resolve();
        } catch (error) {
          console.error('공개 Google API 초기화 실패:', error);
          reject(error);
        }
      });
    } else {
      reject(new Error('GAPI가 로드되지 않았습니다.'));
    }
  });
};

// 공개 폴더 내용 가져오기
export const getPublicFolderContents = async (folderId) => {
  try {
    console.log(`공개 폴더 내용 조회: ${folderId}`);
    
    const response = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,size,thumbnailLink,webViewLink)',
      orderBy: 'folder,name'
    });

    if (response.result && response.result.files) {
      console.log(`${response.result.files.length}개 파일 발견`);
      return response.result.files;
    } else {
      console.warn('폴더 내용을 찾을 수 없습니다.');
      return [];
    }
  } catch (error) {
    console.error('공개 폴더 접근 오류:', error);
    
    if (error.status === 403) {
      throw new Error('폴더가 공개로 설정되지 않았거나 접근 권한이 없습니다. 폴더를 "링크가 있는 모든 사용자"로 공유해주세요.');
    } else if (error.status === 404) {
      throw new Error('폴더를 찾을 수 없습니다. 폴더 ID를 확인해주세요.');
    } else {
      throw new Error(`폴더 접근 실패: ${error.message || '알 수 없는 오류'}`);
    }
  }
};

// 공개 폴더 구조 재귀적으로 가져오기
export const getPublicFolderStructure = async (folderId, depth = 0, maxDepth = 3) => {
  if (depth > maxDepth) {
    return null;
  }

  try {
    const contents = await getPublicFolderContents(folderId);
    
    const folderStructure = {
      id: folderId,
      name: depth === 0 ? 'Root' : '폴더',
      type: 'folder',
      children: []
    };

    // 하위 폴더와 파일 처리
    for (const item of contents) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        // 폴더인 경우 재귀적으로 하위 구조 가져오기
        const subFolder = await getPublicFolderStructure(item.id, depth + 1, maxDepth);
        if (subFolder) {
          subFolder.name = item.name;
          folderStructure.children.push(subFolder);
        }
      } else {
        // 파일인 경우
        folderStructure.children.push({
          id: item.id,
          name: item.name,
          type: 'file',
          mimeType: item.mimeType,
          modifiedTime: item.modifiedTime,
          size: item.size,
          thumbnailLink: item.thumbnailLink,
          webViewLink: item.webViewLink
        });
      }
    }

    return folderStructure;
  } catch (error) {
    console.error(`폴더 구조 조회 실패 (ID: ${folderId}):`, error);
    throw error;
  }
};

// 폴더 ID가 공개인지 확인
export const checkFolderAccess = async (folderId) => {
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType'
    });
    
    return {
      accessible: true,
      name: response.result.name,
      isFolder: response.result.mimeType === 'application/vnd.google-apps.folder'
    };
  } catch (error) {
    console.error('폴더 접근 확인 실패:', error);
    return {
      accessible: false,
      error: error.message
    };
  }
};

// 공개 파일 상세 정보 가져오기 (MindMap에서 사용)
export const getPublicFileDetails = async (fileId) => {
  try {
    console.log(`공개 파일 상세 정보 조회: ${fileId}`);
    
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink'
    });
    
    console.log('파일 상세 정보 조회 성공:', response.result.name);
    return response.result;
  } catch (error) {
    console.error('공개 파일 상세 정보 조회 실패:', error);
    
    if (error.status === 403) {
      throw new Error('파일이 공개로 설정되지 않았거나 접근 권한이 없습니다.');
    } else if (error.status === 404) {
      throw new Error('파일을 찾을 수 없습니다.');
    } else {
      throw new Error(`파일 정보 조회 실패: ${error.message || '알 수 없는 오류'}`);
    }
  }
};

// Google Drive 링크에서 ID 추출하는 유틸리티 함수
export const extractIdFromDriveLink = (link) => {
  if (!link || typeof link !== 'string') {
    return null;
  }

  // 다양한 Google Drive 링크 형식 지원
  const patterns = [
    // 폴더 링크: https://drive.google.com/drive/folders/FOLDER_ID
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    // 파일 링크: https://drive.google.com/file/d/FILE_ID/view
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    // 공유 링크: https://drive.google.com/open?id=ID
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    // 직접 ID만 입력한 경우 (기존 방식 유지)
    /^([a-zA-Z0-9_-]+)$/
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}; 