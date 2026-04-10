# 프론트-백엔드 연결 정리

기준일: 2026-04-10

이 문서는 `Backend_Server` 실제 구현을 우선 기준으로 삼아, 현재 프론트와의 연결 상태를 정리한다.
현재 백엔드 로컬 체크아웃은 `604e89e`에 머물러 있지만, 최신 원격 추적 브랜치 `origin/main`의 최근 변경(`15e6fed`, `0536f72`, `50b1aa9`, `b9afb08`)까지 함께 확인해 문서를 갱신했다.

우선순위는 다음과 같다.

1. `Backend_Server` 실제 컨트롤러, DTO, 엔티티
2. `Backend_Server/tasks/todo.md`
3. `Backend_Server/claude.md`
4. 보조 문서(`db.md`, 루트 `docs/architect.md`)

## 이번 작업에서 실제 연결한 범위

- 로그인: `POST /api/auth/tokens`
- 회원가입: `POST /api/users`
- 비밀번호 재설정: `POST /api/auth/password-reset`
- 세션 복원: 저장된 JWT 기준 `/api/users/me`, `/api/integrations/me`, `/api/business/profile`
- 사용자 대시보드:
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/schedules`
  - `GET /api/dashboard/weekly-summary`
  - `GET /api/dashboard/recent-emails`
- 수신함:
  - `GET /api/inbox`
  - `GET /api/inbox/{emailId}`
  - `POST /api/inbox/{emailId}/reply`
- 상단 알림 패널:
  - `GET /api/notifications`
  - `PATCH /api/notifications/{id}/read`
  - `PATCH /api/notifications/read-all`
- 설정 > 계정:
  - `GET /api/users/me`
  - `DELETE /api/users/me`
  - `PATCH /api/users/me/password`
- 설정 > 이메일 연동:
  - `GET /api/integrations/me`
  - `GET /api/integrations/google/authorization-url`
  - `DELETE /api/integrations/me`
- 비즈니스 프로필:
  - `GET /api/business/profile`
  - `PUT /api/business/profile`
  - `GET /api/business/resources/files`
  - `POST /api/business/resources/files`
  - `DELETE /api/business/resources/files/{resourceId}`
  - `GET /api/business/resources/faqs`
  - `POST /api/business/resources/faqs`
  - `PUT /api/business/resources/faqs/{faqId}`
  - `DELETE /api/business/resources/faqs/{faqId}`
  - `GET /api/business/categories`
  - `GET /api/templates`
  - `POST /api/business/templates/regenerate`
- 템플릿 라이브러리:
  - `GET /api/templates`
  - `POST /api/templates`
  - `PUT /api/templates/{templateId}`
  - `DELETE /api/templates/{templateId}`
  - `GET /api/business/categories`
- 캘린더:
  - `GET /api/calendar/events`
  - `POST /api/calendar/events`
  - `PUT /api/calendar/events/{eventId}`
  - `PATCH /api/calendar/events/{eventId}/confirm`
  - `DELETE /api/calendar/events/{eventId}`
- 자동화 설정:
  - `GET /api/automations/rules`
  - `POST /api/automations/rules`
  - `DELETE /api/automations/rules/{ruleId}`
  - `PATCH /api/automations/rules/{ruleId}/auto-send`
  - `GET /api/business/categories`
  - `GET /api/templates`
  - `GET /api/integrations/me`
- 설정 > 관리자 문의:
  - `GET /api/support-tickets`
  - `GET /api/support-tickets/{ticketId}`
  - `POST /api/support-tickets`
- 관리자 대시보드:
  - `GET /api/admin/dashboard/summary`
  - `GET /api/admin/dashboard/email-volume`
  - `GET /api/admin/dashboard/domain-distribution`
  - `GET /api/admin/dashboard/weekly-trend`
- 관리자 문의 대응:
  - `GET /api/admin/support-tickets`
  - `GET /api/admin/support-tickets/{ticketId}`
  - `POST /api/admin/support-tickets/{ticketId}/reply`
- 프론트 dev 서버:
  - `/api` 요청을 `http://localhost:8080`으로 프록시
  - 필요 시 `VITE_BACKEND_ORIGIN` 또는 `VITE_API_BASE_URL`로 변경 가능

## 현재 기준으로 정리가 필요한 항목

### 1. 비밀번호 재설정 방식

- 백엔드에는 `POST /api/auth/password-reset`가 이미 있다.
- 프론트 로그인 화면도 해당 API에 연결됐다.
- 다만 방식은 이메일 링크 발송형이 아니라 `이름 + 이메일 + 새 비밀번호`를 직접 제출하는 형태다.
- 현재 프로젝트 결정은 이 직접 제출형 방식을 유지하는 것이다.

### 2. 관리자 VPN/IP 제한

- 이전 프론트는 관리자 로그인 시 VPN CIDR을 클라이언트에서 검증했다.
- 실제 백엔드는 `/api/admin/**`에 대해 `ROLE_ADMIN`만 검사한다.
- 이번 연결에서는 백엔드 기준으로 맞춰 클라이언트 VPN 차단 로직을 제거했다.
- 실제 VPN/IP 제한이 필요하면 백엔드 보안 정책으로 다시 구현해야 한다.

### 3. Gmail 다중 계정

- 이전 프론트는 여러 Gmail 계정을 추가하는 UX를 가지고 있었다.
- 실제 백엔드 `Integration`은 사용자당 하나의 연동만 허용한다.
- 이번 연결에서는 단일 Google 계정 연동 기준으로 화면을 단순화했다.
- 현재 프로젝트 결정은 다중 계정을 사용하지 않고 단일 계정 연동으로 유지하는 것이다.

### 4. OAuth 콜백 사용자 경험

- 백엔드 최신 원격 기준으로 Google OAuth 콜백은 이제 JSON 응답이 아니라 `302 redirect`를 반환한다.
- 다만 현재 리다이렉트 대상이 `http://localhost:5173/settings?gmail={bool}&calendar={bool}`로 하드코딩돼 있다.
- 현재 프론트 실제 라우트는 `/app/settings?tab=email`이므로 경로가 맞지 않는다.
- 프론트도 아직 `gmail`, `calendar` 쿼리 파라미터를 읽어 성공/실패 배너를 반영하지 않는다.
- 그래서 현재 프론트는 여전히 새 탭 인증 후 수동 새로고침 UX에 의존한다.
- 추후에는 아래 둘 중 하나로 맞추는 편이 낫다.
  - 백엔드 redirect 경로를 `/app/settings?tab=email&gmail=...&calendar=...`로 변경
  - 또는 프론트 전용 OAuth bridge 라우트를 추가

### 5. 온보딩 완료 기준

- 프론트 라우터는 `onboardingCompleted` 플래그를 사용한다.
- 백엔드 최신 원격 기준으로 아래 API가 추가됐다.
  - `GET /api/onboarding/status`
  - `POST /api/onboarding/complete`
- 프론트 세션 복원은 이제 우선 `GET /api/onboarding/status`를 사용한다.
- 단, 아직 예전 백엔드와의 호환을 위해 해당 API가 없을 때만 아래 임시 규칙으로 폴백한다.
  - 관리자: 항상 완료
  - 일반 사용자: Google 연동 또는 비즈니스 프로필이 있으면 완료로 간주

### 5-1. 온보딩 마지막 단계

- 온보딩 1~2단계는 기존 API를 조합해 연결할 수 있다.
- 백엔드 최신 원격 기준으로 아래 전용 API가 추가됐다.
  - `POST /api/business/templates/generate-initial`
- 요청값은 `industry_type`, `email_tone`, `company_description`, `category_ids`, `faq_ids`, `resource_ids`를 받는다.
- 응답은 `status=PROCESSING`, `processing_count`를 반환한다.
- 프론트 온보딩도 이제 이 API를 사용한다.
- 템플릿 생성 애니메이션이 끝나면 `POST /api/onboarding/complete`를 호출해 완료 상태를 저장한다.
- 상세 내용은 [onboarding-backend-gap.md](./onboarding-backend-gap.md)에 정리했다.

### 6. 설정 저장 범위

- `설정 > 알림`, `설정 > 화면`은 프론트 로컬 상태만 있다.
- 백엔드에는 알림 선호값 저장 API, 화면 위젯/테마 저장 API가 없다.
- 현재는 기존 로컬 동작을 유지한다.

### 7. 아직 mock 상태이거나 부분 연결인 화면

- 사용자 온보딩: 상태 조회/완료/초기 템플릿 생성은 새 온보딩 API 기준으로 연결됐고, OAuth callback UX만 추가 정리가 필요함
- 관리자 사용자/모니터링/템플릿-자동화 화면: 아직 mock 기반
- 관리자 문의 대응: 현재 프론트 작업 트리에서는 실제 API로 연결되어 있으나, 회사명/업종/답변 히스토리 배열은 아직 mock 보강이 섞여 있다

### 8. 최신 백엔드 변경으로 해소된 항목

- 수신함 목록에 `draft_status`가 추가됐다.
- 수신함 상세 `email_info`에 `sender_email`이 추가됐다.
- 수신함 상세 `ai_analysis`에 고정된 `schedule` 구조가 추가됐다.
- 백엔드 CORS에 `http://localhost:5173`, `http://localhost:3000`이 추가됐다.
- `application.yml`의 DB/RabbitMQ 일부 하드코딩이 환경변수 기반으로 바뀌었다.

## 현재 연결 방식 메모

- 비즈니스 프로필과 템플릿 라이브러리는 일반 진입에서는 실제 API를 사용한다.
- 캘린더도 일반 진입에서는 실제 API를 사용한다.
- 수신함도 일반 진입에서는 실제 API를 사용한다.
- 다만 `profile-*`, `templates-*` 시나리오에서는 기존 목업 데이터를 유지해 스크린샷 산출물과 상태 재현 테스트를 계속할 수 있게 했다.
- 캘린더도 `calendar-*` 시나리오에서는 기존 목업 데이터를 유지한다.
- 수신함도 `inbox-*` 시나리오에서는 기존 목업 데이터를 유지한다.
- 자동화 설정도 `automation-*` 시나리오에서는 기존 목업 데이터를 유지한다.
- 온보딩도 `onboarding-*` 시나리오에서는 기존 목업 상태를 유지한다.
- 템플릿 수정에서는 백엔드 계약상 카테고리 변경을 지원하지 않으므로, 수정 화면에서는 카테고리를 읽기 전용으로 처리한다.
- 캘린더는 현재 백엔드 계약상 `제목 / 시작시간 / 종료시간 / 상태` 중심으로만 연결했고, 장소/참석자/메모 등 누락 항목은 [calendar-backend-gap.md](./calendar-backend-gap.md)에 별도로 정리했다.
- 수신함은 백엔드 최신 원격에서 `draft_status`, `sender_email`, `schedule`이 추가됐지만, 프론트가 아직 새 필드를 모두 소비하지 않아 일부 보강 판별이 남아 있다. 상세 내용은 [inbox-backend-gap.md](./inbox-backend-gap.md)에 정리했다.
- 자동화 설정은 현재 `카테고리 카드 = 여러 규칙 묶음`으로 프론트가 직접 그룹핑하고 있으며, bulk 저장/전역 캘린더 자동 등록처럼 아직 직접 지원되지 않는 항목은 [automation-backend-gap.md](./automation-backend-gap.md)에 정리했다.
- 온보딩은 프로필/자료/FAQ/카테고리 저장, 상태 조회, 초기 템플릿 생성, 완료 처리를 실연동했고, 남은 주요 이슈는 OAuth callback 경로 정리다. 상세 내용은 [onboarding-backend-gap.md](./onboarding-backend-gap.md)에 정리했다.

## 후속 작업 권장 순서

1. OAuth redirect 경로와 프론트 query 처리 방식 정리
2. 수신함이 `draft_status`와 고정 `schedule` 구조를 직접 소비하도록 수정
3. 관리자 나머지 화면 연결
