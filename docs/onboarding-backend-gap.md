# 온보딩 백엔드 갭 정리

기준일: 2026-04-10

이 문서는 사용자 온보딩 화면을 기존 백엔드 API에 연결하면서 확인된 부족 항목을 정리한다.
최신 백엔드 원격 추적 브랜치 기준으로 `온보딩 전용 API`와 `초기 템플릿 생성 API`가 추가된 점을 반영했다.

## 현재 프론트가 실제로 연결하는 범위

- `GET /api/integrations/me`
- `GET /api/integrations/google/authorization-url`
- `GET /api/onboarding/status`
- `POST /api/onboarding/complete`
- `GET /api/business/profile`
- `PUT /api/business/profile`
- `GET /api/business/resources/files`
- `POST /api/business/resources/files`
- `DELETE /api/business/resources/files/{resourceId}`
- `GET /api/business/resources/faqs`
- `POST /api/business/resources/faqs`
- `DELETE /api/business/resources/faqs/{faqId}`
- `GET /api/business/categories`
- `POST /api/business/categories`
- `DELETE /api/business/categories/{categoryId}`
- `POST /api/business/templates/generate-initial`

즉 현재 온보딩은 기존 비즈니스 API와 새 온보딩 API를 함께 조합해서 동작한다.

## 최신 백엔드에 추가된 온보딩 전용 API

- `GET /api/onboarding/status`
- `POST /api/onboarding/complete`
- `POST /api/business/templates/generate-initial`

### `GET /api/onboarding/status`

- 응답값: `onboarding_completed`
- 현재 프론트 세션 복원 로직은 아직 이 값을 쓰지 않고, 연동 여부/프로필 존재 여부로 임시 판정한다.

### `POST /api/onboarding/complete`

- 백엔드는 `Users.onboarding_completed`를 갱신할 수 있다.
- 현재 프론트는 마지막 완료 시 여전히 로컬 세션의 `markOnboardingComplete()`에 의존한다.

### `POST /api/business/templates/generate-initial`

- 요청값:
  - `industry_type`
  - `email_tone`
  - `company_description`
  - `category_ids`
  - `faq_ids`
  - `resource_ids`
- 응답값:
  - `status`
  - `processing_count`
- 동작:
  - category 기준으로 초기 템플릿 생성 요청을 RabbitMQ `email.draft` 큐로 발행한다.
  - 실제 템플릿 생성 완료를 기다리는 job id나 상태 조회 API는 아직 없다.

## 현재 프론트가 반영한 부분

### 1. 온보딩 완료 상태 저장/조회 사용

- 프론트 세션 복원은 이제 `GET /api/onboarding/status`를 우선 사용한다.
- 다만 예전 백엔드와의 호환을 위해 해당 API가 없을 때만 아래 규칙으로 폴백한다.
  - 관리자: 항상 완료
  - 일반 사용자: Google 연동 또는 비즈니스 프로필이 있으면 완료로 간주
- 마지막 완료 시에는 `POST /api/onboarding/complete`를 호출한다.

### 2. OAuth 완료 후 프론트 복귀

- 백엔드 최신 원격 기준으로 Google OAuth 콜백은 `302 redirect`를 하도록 바뀌었다.
- 하지만 현재 리다이렉트 대상이 `http://localhost:5173/settings?gmail={bool}&calendar={bool}`로 하드코딩돼 있다.
- 현재 프론트 실제 라우트는 `/app/settings?tab=email`이므로 경로가 맞지 않는다.
- 온보딩 화면으로 직접 돌아오지도 않는다.
- 프론트는 여전히 인증 URL을 새 탭으로 열고 `GET /api/integrations/me` polling으로 연결 여부를 확인한다.

필요한 개선 예시:

- 백엔드 redirect 경로를 `/onboarding` 또는 `/app/settings?tab=email` 기준으로 변경
- 프론트가 `gmail`, `calendar` 쿼리 파라미터를 읽어 성공/실패 배너를 표시
- 또는 popup/bridge용 프론트 전용 콜백 URL 지원

### 3. 초기 템플릿 생성 API 연결

- 프론트 온보딩은 이제 마지막 단계에서 `POST /api/business/templates/generate-initial`를 호출한다.
- 요청값으로 `industry_type`, `email_tone`, `company_description`, `category_ids`, `faq_ids`, `resource_ids`를 전달한다.
- 다만 응답은 `PROCESSING`과 `processing_count`만 주기 때문에, 실제 생성 완료 여부를 polling하거나 job 단위로 확인하는 기능은 아직 없다.

## 프론트가 현재 보완 처리하는 방식

- 이메일 연동: authorization URL 발급 후 연동 상태 polling
- 프로필/자료/FAQ/카테고리: 각 API를 온보딩 단계에서 직접 호출
- 온보딩 완료: 백엔드 `complete` 호출 성공 후 로컬 세션 갱신
- 초기 템플릿 생성: `generate-initial` 응답의 `processing_count`를 사용해 생성 애니메이션을 진행

## 현재 남은 핵심 작업

1. OAuth callback redirect 경로와 프론트 수신 라우트 정리
2. `gmail`, `calendar` query 파라미터를 설정/온보딩 화면에서 읽어 성공 안내 반영
3. 초기 템플릿 생성 완료 여부를 확인할 수 있는 polling 또는 job 조회 계약 검토
