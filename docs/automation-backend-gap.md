# 자동화 설정 백엔드 갭 정리

기준일: 2026-04-04

이 문서는 사용자 앱의 자동화 설정 화면을 `Backend_Server` 실제 API에 연결하면서 확인된 부족 항목을 정리한다.

## 현재 프론트에서 실제 연결한 범위

- `GET /api/automations/rules`
- `POST /api/automations/rules`
- `DELETE /api/automations/rules/{ruleId}`
- `PATCH /api/automations/rules/{ruleId}/auto-send`
- `GET /api/business/categories`
- `GET /api/templates`
- `GET /api/integrations/me`

현재 프론트는 카테고리를 하나의 묶음으로 보고, 그 안에 속한 템플릿 ID를 모두 보여 준 다음 템플릿별 자동 발송 여부를 제어한다.

실제 백엔드는 `규칙 1개 = 카테고리 1개 + 템플릿 1개 + 자동 발송 1개` 구조다.

## 프론트가 현재 보완 처리하는 부분

### 1. 카테고리 묶음 저장

- 프론트는 카테고리 카드 하나를 보여 주지만, 저장 시에는 카테고리 내부 템플릿 수만큼 여러 개의 `POST /api/automations/rules` 요청을 보낸다.
- 즉 카테고리 단위 bulk create API가 없어 프론트가 다건 요청을 순차/병렬로 직접 조합하고 있다.

필요한 보완 API 예시:

- `POST /api/automations/categories/{categoryId}/rules`
- 요청값:
  - `template_ids`
  - `auto_send_defaults`

### 2. 카테고리 묶음 수정

- 현재는 규칙별 `PATCH /auto-send`만 있어, 편집 다이얼로그 저장 시 프론트가 템플릿별로 여러 번 호출해야 한다.
- 새 템플릿이 카테고리에 추가된 경우에도 프론트가 누락 규칙을 직접 찾아 `POST` 해야 한다.

필요한 보완 API 예시:

- `PUT /api/automations/categories/{categoryId}/rules`
- 요청값:
  - `templates: [{ template_id, auto_send_enabled }]`

### 3. 카테고리 묶음 삭제

- 현재는 카테고리 삭제 API가 없어서 프론트가 해당 카테고리의 `rule_id`를 모두 찾아 `DELETE`를 반복 호출한다.

필요한 보완 API 예시:

- `DELETE /api/automations/categories/{categoryId}/rules`

## 현재 백엔드에서 빠져 있는 UX 기준

### 1. 전역 캘린더 자동 등록 토글

- 현재 사용자 프론트에는 `전역 일정 자동 등록` 성격의 UX가 있다.
- 실제 백엔드는 `rule_id` 기준 `auto_calendar_enabled`만 제공한다.
- 따라서 프론트의 `전역 토글 + 카테고리 묶음` 구조와 1:1로 맞지 않아 실제 연결을 보류했다.

필요한 보완 항목:

- 전역 자동 등록 설정 저장 컬럼 또는 사용자 설정 테이블
- 카테고리 단위 자동 등록 기준 API

예시 컬럼:

- `Users.auto_calendar_enabled`

예시 API:

- `GET /api/automations/calendar-settings`
- `PUT /api/automations/calendar-settings`

### 2. 카테고리에 속한 템플릿 전체 목록 응답

- 현재 프론트는 `GET /api/templates` 전체 목록을 받은 뒤 카테고리별로 직접 그룹핑한다.
- 자동화 화면만을 위한 목적이라면 카테고리별 템플릿 목록을 바로 주는 API가 있으면 더 단순해진다.

예시 API:

- `GET /api/automations/categories`
- 응답:
  - `category_id`
  - `category_name`
  - `color`
  - `templates: [{ template_id, title }]`

## DB/엔티티 관점 메모

현재 `AutomationRule` 엔티티는 아래 값만 가진다.

- `rule_id`
- `user_id`
- `category_id`
- `template_id`
- `auto_send_enabled`
- `auto_calendar_enabled`

즉 카테고리 묶음 저장 자체를 표현하는 별도 개념은 없다.

장기적으로 카테고리 중심 UX를 유지하려면 아래 둘 중 하나가 필요하다.

1. 지금처럼 `AutomationRule`만 유지하고 프론트가 계속 묶어서 관리
2. `AutomationCategoryConfig` 같은 상위 개념을 추가해 카테고리 단위 설정을 명시적으로 저장

## 현재 프론트 처리 방식 요약

- 카테고리 카드: 프론트가 규칙 배열을 카테고리별로 그룹핑
- 템플릿 ID 목록: `GET /api/templates` 결과를 카테고리별로 합침
- 템플릿별 자동 발송 토글:
  - 규칙이 있으면 `PATCH /auto-send`
  - 규칙이 없으면 `POST /rules`
- 카테고리 삭제:
  - 연결된 `rule_id`를 찾아 여러 번 `DELETE`

즉 현재 연결은 가능하지만, 카테고리 중심 UX를 백엔드가 직접 지원하는 상태는 아니다.
