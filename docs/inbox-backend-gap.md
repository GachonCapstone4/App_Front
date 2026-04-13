# 수신함 프론트-백엔드 연결 갭 정리

기준일: 2026-04-10

이 문서는 현재 `frontend/App` 수신함 화면 흐름을 기준으로, `Backend_Server` 실제 API와 아직 맞지 않는 항목을 정리한다.
최신 백엔드 원격 추적 브랜치 기준으로 `draft_status`, `sender_email`, 고정 `schedule` 응답이 추가된 점을 반영했다.

## 1. 현재 연결된 범위

현재 실제 API로 연결한 범위:

- `GET /api/inbox`
- `GET /api/inbox/{emailId}`
- `POST /api/inbox/{emailId}/reply`

현재 화면에서 실제 액션으로 연결한 범위:

- 발송하기 → `SEND`
- 편집 후 발송 → `EDIT_SEND`
- 건너뛰기 → `SKIP`

## 2. 프론트 기준 상태 체계

현재 프론트 수신함은 아래 4개 상태로 본다.

- `pending`
- `completed`
- `unsent`
- `auto-sent`

의미:

- `pending`: 검토 대기
- `completed`: 사용자가 발송 완료
- `unsent`: 읽음 확인은 했지만 발송하지 않음
- `auto-sent`: 자동 발송됨

## 3. 현재 백엔드 상태 체계

현재 `EmailStatus`는 아래 3개다.

- `PENDING_REVIEW`
- `PROCESSED`
- `AUTO_SENT`

그리고 `DraftStatus`는 아래 4개다.

- `PENDING_REVIEW`
- `EDITED`
- `SENT`
- `SKIPPED`

즉 현재 `unsent`는 이메일 상태로 직접 존재하지 않지만, 최신 목록 응답의 `draft_status=SKIPPED`로 직접 구분할 수 있다.

## 4. 현재 연결 방식

현재 프론트는 아래처럼 보강한다.

- 목록 응답의 `draft_status=SKIPPED`는 바로 `unsent`로 매핑
- `draft_status=SENT | EDITED`는 `completed`로 매핑
- 그 외 `status=PROCESSED`는 `completed`, `AUTO_SENT`는 `auto-sent`로 매핑

이 방식으로 현재 요구사항인 “읽음 확인은 했지만 답변을 발송하지 않은 메일” 묶음은 구현 가능하다.

다만 한계가 있다.

- 목록 단계의 상태 분류는 정리됐지만, 화면 내부 다른 영역은 아직 최신 상세 응답을 전부 활용하지 않는다

## 5. 최신 백엔드에서 이미 해소된 항목

### 5.1 목록 응답 `draft_status`

- 최신 백엔드 원격 기준으로 `GET /api/inbox` 응답에 `draft_status`가 추가됐다.
- 프론트는 이 값을 이미 반영해 목록 단계에서 `completed`와 `unsent`를 구분한다.

### 5.2 상세 응답 `sender_email`

- 최신 백엔드 원격 기준으로 `GET /api/inbox/{emailId}`의 `email_info.sender_email`이 추가됐다.
- 프론트 `InboxDetailApiResponse`는 이미 optional 필드로 선언해 두었지만, 관련 UI 활용은 아직 제한적이다.

### 5.3 상세 응답 `ai_analysis.schedule`

- 최신 백엔드 원격 기준으로 `ai_analysis.schedule`에 아래 구조가 추가됐다.
  - `has_schedule`
  - `title`
  - `date`
  - `start_time`
  - `end_time`
  - `location`
  - `participants`
- 이는 기존 `entities` 자유 구조보다 프론트 일정 카드 렌더링에 훨씬 적합하다.

## 6. 프론트가 아직 수정해야 하는 항목

### 6.1 일정 카드가 `schedule` 대신 `entities`를 우선 사용

- 프론트 수신함은 일정 정보를 아직 `ai_analysis.entities` 중심으로 해석한다.
- 최신 백엔드의 고정 `ai_analysis.schedule` 구조를 우선 사용하도록 수정하는 편이 낫다.

### 6.2 `display_status`는 여전히 없어서 프론트 재해석이 필요

- `draft_status` 추가로 최소 요구사항은 충족됐지만, 목록 응답에 `display_status` 같은 프론트 친화 상태는 아직 없다.
- 따라서 `PENDING_REVIEW / PROCESSED / AUTO_SENT + draft_status` 조합을 프론트에서 여전히 해석해야 한다.

## 8. 첨부파일/추천 초안/일정 액션의 현재 상태

백엔드 API는 이미 존재한다.

- `GET /api/inbox/{emailId}/attachments/{attachmentId}`
- `GET /api/inbox/{emailId}/recommendations`
- `POST /api/inbox/{emailId}/calendar`

하지만 현재 프론트 수신함 화면에는 아직 직접 연결하지 않았다.

이유:

- 첨부파일 UI가 아직 없음
- 추천 초안 비교 UX가 아직 없음
- 일정 액션은 캘린더 연결 범위와 함께 정리 필요

## 9. 현재 남은 우선 작업

1. 일정 카드 렌더링을 `ai_analysis.schedule` 기준으로 전환
2. 발신자 이메일을 상세/패널 UI에서 직접 활용
3. 이후 추천 초안/첨부파일/일정 액션을 화면에 직접 연결
