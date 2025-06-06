# 🧠 구글 드라이브 마인드맵 시각화 도구

**OAuth 로그인 없이** 공개 구글 드라이브 폴더를 아름다운 마인드맵으로 시각화하는 웹 도구입니다.

## ✨ 주요 기능

- 🗂️ **OAuth 로그인 불필요**: 공개 구글 드라이브 폴더를 즉시 접근
- 🎨 **인터랙티브 마인드맵**: 폴더 구조를 방사형 레이아웃으로 시각화
- 🔄 **실시간 업데이트**: 30초마다 자동 새로고침으로 실시간 변경사항 반영
- 🎯 **직관적인 UI**: 확대/축소/초기화 등 시각화 제어 기능
- 📱 **반응형 디자인**: 모든 디바이스에서 완벽한 사용자 경험
- 🔗 **범용성**: 누구나 폴더 ID만 있으면 바로 사용 가능

## 🚀 빠른 시작

### 1. 웹사이트 접속
[https://mindmap-seven-amber.vercel.app](https://mindmap-seven-amber.vercel.app)

### 2. 구글 드라이브 폴더 공개 설정
1. Google Drive에서 폴더를 우클릭 → **"공유"** 선택
2. **"링크가 있는 모든 사용자"**로 설정
3. 권한을 **"뷰어"**로 설정

### 3. 폴더 ID 입력
1. 앱에서 **"폴더 변경"** 버튼 클릭
2. 공개 폴더의 ID 입력
3. **"적용"** 클릭하면 즉시 마인드맵 생성!

## 📋 폴더 ID 찾는 방법

구글 드라이브 공유 링크에서 폴더 ID를 추출하세요:

```
링크: https://drive.google.com/drive/folders/1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9?usp=sharing
폴더 ID: 1MTFQM7oGUGDg5xYwbuuw7rwrXXfoU-a9
```

## 🛠️ 로컬 개발 환경 설정

### 필수 사항
- Node.js (v14 이상)
- npm 또는 yarn

### 설치 방법

1. **저장소 복제**
```bash
git clone https://github.com/your-username/mindmap.git
cd mindmap
```

2. **패키지 설치**
```bash
npm install
# 또는
yarn install
```

3. **애플리케이션 실행**
```bash
npm start
# 또는
yarn start
```

4. **브라우저에서 확인**
```
http://localhost:3000
```

## 🎯 사용 방법

### 기본 사용법
1. 앱 접속 (로그인 불필요!)
2. **"폴더 변경"** 버튼으로 원하는 공개 폴더 ID 입력
3. 마인드맵으로 시각화된 폴더 구조 확인
4. 노드 클릭으로 상세 정보 보기

### 고급 기능
- **자동 새로고침**: 30초마다 최신 상태 반영
- **수동 새로고침**: 언제든 즉시 새로고침 가능
- **시각화 제어**: 확대/축소/드래그/초기화
- **폴더 전환**: 여러 공개 폴더 간 쉬운 전환

## 🏗️ 기술 스택

- **Frontend**: React.js, Material-UI
- **시각화**: D3.js (방사형 레이아웃)
- **API**: Google Drive API v3 (공개 접근)
- **배포**: Vercel
- **언어**: JavaScript (ES6+)

## 📊 성능 및 제한사항

### ✅ 장점
- OAuth 설정 불필요
- 즉시 사용 가능
- 개인정보 수집 없음
- 실시간 업데이트

### ⚠️ 제한사항
- 공개 폴더만 접근 가능
- 읽기 전용 (수정/삭제 불가)
- 최대 3단계 깊이까지 탐색
- API 할당량: 일일 100,000,000 요청

## 🎨 커스터마이징

### 스타일 수정
- `src/index.css`: 전역 스타일
- `src/components/MindMap.js`: 마인드맵 시각화 스타일

### 설정 변경
- `src/services/publicDriveService.js`: API 설정
- `src/App.js`: 기본 폴더 ID 및 새로고침 간격

## 📁 권장 폴더 구조

최적의 성능을 위해 다음 구조를 권장합니다:

```
📁 루트 폴더 (공개)
├── 📁 문서
│   ├── 📄 보고서.pdf
│   └── 📄 프레젠테이션.pptx
├── 📁 이미지
│   ├── 🖼️ 다이어그램.png
│   └── 🖼️ 스크린샷.jpg
└── 📁 프로젝트
    ├── 📁 소스코드
    └── 📄 README.md
```

## 🔧 문제 해결

### 자주 묻는 질문

**Q: "폴더에 접근할 수 없습니다" 오류가 나요**
A: 폴더가 "링크가 있는 모든 사용자"로 공개 설정되었는지 확인하세요.

**Q: 로딩이 너무 느려요**
A: 폴더 내 파일이 너무 많거나 깊이가 깊을 수 있습니다. 파일을 정리하거나 하위 폴더로 분산시켜보세요.

**Q: 실시간 업데이트가 안 돼요**
A: 자동 새로고침이 켜져있는지 확인하고, 수동으로 새로고침 버튼을 눌러보세요.

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🔗 링크

- **라이브 데모**: [https://mindmap-seven-amber.vercel.app](https://mindmap-seven-amber.vercel.app)
- **GitHub**: [Repository Link]
- **문제 신고**: [GitHub Issues]

---

**🎉 이제 OAuth 설정 없이도 공개 Google Drive 폴더를 아름다운 마인드맵으로 즐겨보세요!**