# 프론트 협업 문서

프론트-백엔드 연결 진행 상황과, 백엔드에서 수정이 필요한 항목을 함께 정리하는 문서 모음이다.
현재 문서는 `Backend_Server` 로컬 체크아웃뿐 아니라 최신 원격 추적 브랜치 `origin/main`의 최근 변경까지 반영해 관리한다.

백엔드 협업 시에는 아래 순서로 확인한다.

1. [frontend-backend-integration-gap.md](./frontend-backend-integration-gap.md)
2. [onboarding-backend-gap.md](./onboarding-backend-gap.md)
3. [inbox-backend-gap.md](./inbox-backend-gap.md)
4. [calendar-backend-gap.md](./calendar-backend-gap.md)
5. [automation-backend-gap.md](./automation-backend-gap.md)

## 문서 역할

### frontend-backend-integration-gap.md

- 전체 연결 진행 상황 총괄
- 현재 실제로 연결된 API 범위 정리
- 최신 백엔드 변경으로 해소된 항목과 프론트 후속 작업 분리
- 화면별 보완 사항 링크 모음

### onboarding-backend-gap.md

- 온보딩 단계형 흐름과 백엔드 계약 갭
- 전용 온보딩 API, 초기 템플릿 생성, 완료 상태, OAuth 복귀 UX 정리

### inbox-backend-gap.md

- 수신함 상태 체계와 상세 응답 보강 필요 사항
- `unsent` 구분, `draft_status`, 발신자 이메일, 일정 구조화 응답 정리

### calendar-backend-gap.md

- 캘린더 저장/조회 계약의 부족한 필드 정리
- 장소, 참석자, 메모, 일정 유형 등 상세 필드 확장 요청

### automation-backend-gap.md

- 카테고리 묶음 UX와 규칙 단건 API 사이의 갭 정리
- bulk 저장, 전역 캘린더 자동 등록, 카테고리별 템플릿 목록 정리
