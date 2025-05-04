# Google API 설정 방법

이 문서는 Google API 콘솔에서 OAuth 클라이언트 ID를 올바르게 설정하는 방법을 안내합니다.

## 현재 사용 중인 API 정보

- **클라이언트 ID**: `362381193698-ubvpejukf8u2e8vkq1nlkeofl83q7l56.apps.googleusercontent.com`
- **API 키**: `AIzaSyBzDqaWmNVJ8-0c-m_niBBOMz-dgAkQV70`

## 오류 해결: "The OAuth client was not found"

이 오류는 다음과 같은 이유로 발생할 수 있습니다:

1. OAuth 클라이언트 ID가 Google API 콘솔에서 잘못 구성되었습니다.
2. 배포된 애플리케이션의 도메인(URL)이 Google API 콘솔에 승인된 도메인으로 등록되지 않았습니다.
3. 클라이언트 ID가 애플리케이션에서 올바르게 사용되지 않고 있습니다.

## 해결 방법

### 1. Google Cloud Console에서 OAuth 설정 확인

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속하세요.
2. 프로젝트를 선택하거나 새 프로젝트를 만드세요.
3. 왼쪽 메뉴에서 "API 및 서비스" > "사용자 인증 정보"로 이동하세요.
4. "OAuth 2.0 클라이언트 ID" 섹션에서 사용 중인 클라이언트 ID를 찾아 클릭하세요.
5. 다음 설정을 확인하고 필요한 경우 업데이트하세요:

#### 승인된 JavaScript 원본 (Authorized JavaScript origins)

배포된 사이트의 도메인을 추가해야 합니다. 다음 URL을 추가하세요:

```
https://mindmap-seven-amber.vercel.app
https://mindmap-qo1598.vercel.app
https://qo1598-mindmap.vercel.app
```

또한 로컬 개발을 위해 다음 URL도 추가하는 것이 좋습니다:

```
http://localhost:3000
http://localhost:5000
```

#### 승인된 리디렉션 URI (Authorized redirect URIs)

웹 애플리케이션의 경우 인증 후 리디렉션할 URL을 지정해야 합니다. 다음 URL을 추가하세요:

```
https://mindmap-seven-amber.vercel.app
https://mindmap-qo1598.vercel.app
https://qo1598-mindmap.vercel.app
https://mindmap-seven-amber.vercel.app/
https://mindmap-qo1598.vercel.app/
https://qo1598-mindmap.vercel.app/
```

### 2. OAuth 동의 화면 설정

1. Google Cloud Console의 "API 및 서비스" > "OAuth 동의 화면"으로 이동하세요.
2. 애플리케이션 유형을 선택하세요 (External 또는 Internal).
3. 필요한 정보를 입력하세요:
   - 앱 이름
   - 사용자 지원 이메일
   - 개발자 연락처 정보
4. "저장 후 계속"을 클릭하세요.
5. 필요한 스코프를 추가하세요 (https://www.googleapis.com/auth/drive.metadata.readonly).
6. "저장 후 계속"을 클릭하세요.
7. 테스트 사용자를 추가하세요 (필요한 경우).
8. "저장 후 계속"을 클릭하세요.

### 3. API 활성화

1. Google Cloud Console의 "API 및 서비스" > "라이브러리"로 이동하세요.
2. "Google Drive API"를 검색하여 선택하세요.
3. "사용 설정" 버튼을 클릭하여 API를 활성화하세요.

### 4. 변경사항 적용 후 테스트

1. Google Cloud Console에서 변경사항을 저장한 후 5-10분 정도 기다려 변경사항이 적용되도록 하세요.
2. 다시 애플리케이션을 테스트하세요.

## 디버깅

더 자세한 오류 정보를 얻으려면:

1. 배포된 사이트에서 `/debug.html` 페이지에 접속하세요 (예: https://mindmap-seven-amber.vercel.app/debug.html).
2. 이 페이지에서 제공하는 디버깅 도구를 사용하여 Google API 연결 문제를 진단하세요.
3. 콘솔 로그를 확인하여 더 자세한 오류 메시지를 확인하세요.

## 추가 참고 사항

- 클라이언트 ID와 API 키가 애플리케이션 코드에서 올바르게 사용되고 있는지 확인하세요.
- OAuth 동의 화면에서 애플리케이션 상태가 "테스트 중"인 경우, 승인된 테스트 사용자만 애플리케이션에 접근할 수 있습니다. 