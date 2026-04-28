# EmailAssist Frontend

`frontend` 디렉터리는 EmailAssist의 실제 화면과 사용자 흐름을 담는 프론트엔드 영역입니다.
현재 런타임 기준으로는 `frontend/App` 하나가 사용자 서비스와 관리자 콘솔을 함께 제공합니다.

서비스는 반복적인 업무 이메일을 더 적은 클릭으로 처리할 수 있도록 설계되어 있습니다.
사용자는 수신 메일을 확인하고, AI가 제안한 답변 초안을 검토하거나 발송할 수 있으며, 일정 관련 메일은 캘린더 등록까지 이어집니다.
관리자는 같은 앱 안의 `/admin/*` 경로에서 운영 지표, 사용자 관리, 템플릿/자동화 관리, 문의 대응, 시스템 운영 모니터링을 수행합니다.

## 현재 진입 구조

- `/`
  - 로그인 / 회원가입
  - 관리자와 일반 사용자 공용 진입점
- `/onboarding`
  - Gmail 연동, 회사 프로필, 자료 업로드, 카테고리 설정, 템플릿 생성
- `/app/*`
  - 일반 사용자 업무 화면
- `/admin/*`
  - 관리자 운영 콘솔

관리자 접근은 계정 권한과 VPN 허용 IP 조건을 함께 확인하는 프로토타입 흐름으로 구현되어 있습니다.

## 폴더 구조

```text
frontend/
├─ App/
│  ├─ src/
│  │  ├─ admin/        # App 내부 관리자 콘솔 UI, 레이아웃, 시나리오
│  │  ├─ app/          # 앱 조립, 라우터, 전역 진입 구성
│  │  ├─ entities/     # 캘린더, 이메일, 설정 등 도메인 단위 모델
│  │  ├─ features/     # 수신함, 설정, 레이아웃 등 기능 단위 UI
│  │  ├─ pages/        # 라우트 페이지 엔트리
│  │  ├─ shared/       # 공용 유틸, 시나리오, UI 프리미티브
│  │  └─ styles/       # 전역 스타일, 테마, 폰트
│  ├─ index.html
│  └─ package.json
├─ architect.md        # 프론트엔드 상세 설계 참고 문서
└─ README.md
```

## `App` 구성 설명

### 사용자 서비스

`frontend/App/src/pages`와 `frontend/App/src/features`를 중심으로 구성됩니다.

- `auth`
  - 로그인, 회원가입, 비밀번호 재설정
- `onboarding`
  - 이메일 연동부터 템플릿 생성까지의 최초 설정 흐름
- `dashboard`
  - 메일/일정/처리 현황 요약
- `inbox`
  - 메일 목록, 상세 내용, 답변 초안 검토와 발송
- `calendar`
  - 일정 조회, 생성, 수정, 삭제
- `template-library`
  - 생성된 템플릿 조회, 미리보기, 수정, 삭제
- `business-profile`
  - 회사 정보, 자료 업로드, FAQ, 템플릿 재생성
- `automation-settings`
  - 카테고리 규칙, 자동 발송, 캘린더 연동 설정
- `settings`
  - 계정, 알림, 화면, 이메일 연동, 관리자 문의

### 관리자 콘솔

관리자 UI는 별도 프론트앱이 아니라 `frontend/App/src/admin` 아래에 통합돼 있습니다.

- `pages/dashboard.jsx`
  - 운영 대시보드
- `pages/users.jsx`
  - 사용자 관리
- `pages/template-automation.jsx`
  - 템플릿 / 자동화 관리
- `pages/inquiries.jsx`
  - 사용자 문의 대응
- `pages/monitoring.jsx`
  - 시스템 운영 모니터링
- `shared/`
  - 관리자 전용 mock 데이터, 상태 화면, 공용 UI
- `styles/index.css`
  - 관리자 전용 레이아웃/테마 스타일

## 기술 스택

- React 18
- Vite
- TypeScript 중심 구성
- React Router
- Radix UI 기반 공용 입력/드롭다운 UI
- Tailwind CSS + 커스텀 CSS 변수 테마
- Vitest

관리자 화면 일부는 현재 JSX 파일을 유지하고 있지만, 런타임은 모두 `frontend/App` 안에서 동작합니다.

## 개발 명령

`frontend/App` 기준으로 실행합니다.

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`
- `npm run test`
- `npm run lint`

## 문서와 산출물

- 프론트엔드 상세 설계 참고: [`architect.md`](/home/hojin/Projects/email-assistant/frontend/architect.md)
- 저장소 전체 설계 기준: [`../docs/architect.md`](/home/hojin/Projects/email-assistant/docs/architect.md)
