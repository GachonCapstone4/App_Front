# EmailAssist App Front

EmailAssist는 반복적인 업무 이메일을 더 빠르고 일관되게 처리하기 위한 프론트엔드 애플리케이션입니다. 사용자는 수신 메일을 확인하고, AI가 제안한 답장 초안을 검토하며, 메일 속 일정 후보를 캘린더 작업으로 이어갈 수 있습니다. 관리자는 같은 애플리케이션 안에서 사용자, 문의, 템플릿 자동화, 운영 상태를 관리합니다.

이 저장소는 웹 SPA, Docker 배포용 정적 번들, Electron 데스크톱 앱 빌드를 함께 관리합니다.

## 주요 기능

- 수신함 기반 이메일 업무 처리
- AI 답장 초안 검토 및 발송 흐름
- 메일 본문 기반 일정 후보 감지
- 캘린더 조회, 등록, 수정, 삭제
- 템플릿 라이브러리 및 자동화 설정
- 비즈니스 프로필, FAQ, 회사 자료 관리
- 사용자 설정, 알림, 이메일 연동 관리
- 관리자 대시보드, 사용자 관리, 문의 대응, 운영 모니터링
- Electron 기반 Windows, macOS, Linux 데스크톱 앱 배포

## 애플리케이션 경로

- `/`
  - 로그인, 회원가입, 비밀번호 재설정
- `/onboarding`
  - Gmail 연동, 회사 프로필, 자료 업로드, 카테고리 설정, 템플릿 생성
- `/app`
  - 사용자 대시보드
- `/app/inbox`
  - 이메일 목록, 상세 메일, AI 답장 초안
- `/app/calendar`
  - 일정 관리
- `/app/templates`
  - 템플릿 라이브러리
- `/app/automation`
  - 자동화 설정
- `/app/profile`
  - 비즈니스 프로필
- `/app/settings`
  - 계정, 알림, 화면, 이메일 연동, 관리자 문의 설정
- `/admin`
  - 관리자 운영 콘솔

## 기술 스택

- React 18
- Vite 6
- TypeScript
- React Router
- Tailwind CSS 4
- Radix UI
- MUI Icons
- TanStack Query
- Zustand
- Vitest
- Electron
- electron-builder
- Docker + nginx

## 폴더 구조

```text
App_Front/
├─ App/
│  ├─ electron/      # Electron 메인 프로세스
│  ├─ src/
│  │  ├─ admin/      # 관리자 콘솔
│  │  ├─ app/        # 앱 조립, 라우터, 전역 Provider
│  │  ├─ entities/   # 도메인 모델과 기본 데이터
│  │  ├─ features/   # 기능 단위 UI
│  │  ├─ pages/      # 라우트 엔트리
│  │  ├─ shared/     # 공용 API, 타입, UI, 시나리오
│  │  └─ styles/     # 전역 스타일과 테마
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.js
├─ Dockerfile
├─ DESIGN.md
└─ README.md
```

## 시작하기

Node.js 20 LTS를 권장합니다. GitHub Actions도 Node 20을 기준으로 빌드합니다.

```bash
cd App
npm ci
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다.

## 환경변수

예시는 [App/.env.local.example](App/.env.local.example)에 있습니다.

```bash
cp App/.env.local.example App/.env.local
```

주요 환경변수:

```text
VITE_API_BASE_URL
VITE_ADMIN_API_BASE_URL
VITE_SSE_BASE_URL
VITE_BACKEND_ORIGIN
VITE_SSE_ORIGIN
VITE_DEMO_MODE
```

주의할 점:

- `VITE_*` 값은 Vite 빌드 시점에 정적 번들에 포함됩니다.
- Electron 앱에서도 `VITE_*` 값은 설치 파일을 만들 때 고정됩니다.
- API URL, 데모 모드 같은 공개 가능한 값만 `VITE_*`로 사용하세요.
- API key, OAuth client secret, JWT secret 같은 비밀값은 프론트엔드나 Electron 번들에 넣으면 안 됩니다.
- 운영 환경 값은 GitHub Actions variables 또는 Docker build args로 관리하는 것을 권장합니다.

## 명령어

`App/` 디렉터리에서 실행합니다.

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run test
npm run lint
```

Electron 관련 명령:

```bash
npm run electron
npm run electron:pack
npm run electron:dist
```

- `electron`: Vite 프로덕션 번들을 만든 뒤 Electron으로 실행합니다.
- `electron:pack`: 설치 파일 없이 패키징 구조를 검증합니다.
- `electron:dist`: GitHub Release에 업로드할 설치 파일을 생성합니다.

## Docker 배포

루트 디렉터리에서 Docker 이미지를 빌드합니다.

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://capstone.studylink.click \
  --build-arg VITE_ADMIN_API_BASE_URL=https://admin.studylink.click \
  --build-arg VITE_SSE_BASE_URL=https://capstone.studylink.click \
  --build-arg VITE_DEMO_MODE=false \
  -t emailassist-app-front .
```

실행:

```bash
docker run --rm -p 8080:80 emailassist-app-front
```

Docker 이미지는 Vite 빌드 결과물을 nginx로 서빙합니다. SPA 라우팅을 위해 모든 경로는 `index.html`로 fallback 됩니다.

## Electron 배포

Electron 앱은 [App/electron/main.cjs](App/electron/main.cjs)를 메인 프로세스로 사용합니다. Vite 빌드 결과물인 `App/dist`를 Electron 창에서 로드하며, 내부 라우팅 새로고침을 위해 전용 `emailassist://` 프로토콜을 사용합니다.

`electron-builder` 설정은 [App/package.json](App/package.json)의 `build` 필드에 있습니다.

지원 대상:

- macOS: `dmg`, `zip`
- Windows: `nsis`
- Linux: `AppImage`, `deb`

빌드 산출물은 `App/release`에 생성되며 git과 Docker build context에서 제외됩니다.

## 앱 업데이트

패키징된 Electron 앱은 실행 시 GitHub Release의 업데이트 메타데이터를 확인합니다. 새 버전이 감지되면 자동으로 설치하지 않고 사용자에게 알림을 표시합니다.

업데이트 흐름:

- 앱 실행 시 새 버전 확인
- 새 버전이 있으면 업데이트 알림 표시
- 사용자가 `업데이트`를 누르면 다운로드 시작
- 다운로드 완료 후 사용자가 `설치 후 재시작`을 누르면 업데이트 설치

자동 업데이트에는 GitHub Release asset에 설치 파일뿐 아니라 `latest*.yml`, `*.blockmap`, macOS용 `zip` 파일이 함께 업로드되어야 합니다. CI의 태그 릴리스 workflow가 이 파일들을 Release asset으로 업로드합니다.

## GitHub Actions

[.github/workflows/CI.yaml](.github/workflows/CI.yaml)은 두 가지 흐름을 처리합니다.

일반 push 또는 pull request:

- Docker 이미지 빌드
- main push 시 Docker Hub 푸시

`v*` 태그 push:

- Windows, macOS, Linux Electron 설치 파일 빌드
- GitHub Actions artifact 업로드
- GitHub Release 생성
- 설치 파일을 Release asset으로 게시

릴리스 예시:

```bash
git tag v0.2.1
git push origin v0.2.1
```

GitHub 저장소 설정에서 Actions workflow permission은 `Read and write permissions`가 필요합니다. Docker Hub 푸시에는 다음 값이 필요합니다.

- Repository variable: `CAPSTONE_CI_VAR`
- Repository secret: `Capstone_CI_Secret`

## 다운로드 페이지 연동

별도 Vercel 정적 페이지는 `GachonCapstone4/App_Front`의 GitHub Releases API를 읽어 최신 설치 파일을 표시합니다. 새 `v*` 태그 릴리스가 생성되면 다운로드 페이지는 재배포 없이 최신 Release asset 목록을 보여줄 수 있습니다.

## 테스트

```bash
cd App
npm run test -- --run
```

현재 테스트는 주요 화면 helper 로직을 중심으로 구성되어 있습니다.

## ignore 정책

다음 파일과 폴더는 저장소에 포함하지 않습니다.

- `App/node_modules`
- `App/dist`
- `App/release`
- `App/.vite`
- `App/coverage`
- `.env*`
- 로그와 OS 임시 파일

`App/electron`은 Electron 메인 프로세스 소스이므로 커밋 대상입니다.
