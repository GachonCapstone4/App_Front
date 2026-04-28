# 캘린더 프론트-백엔드 연결 갭 정리

기준일: 2026-04-04

이 문서는 현재 `frontend/App`의 캘린더 화면 흐름을 기준으로, `Backend_Server` 캘린더 API에 연결된 범위와 아직 백엔드에 없는 항목을 정리한다.

## 1. 현재 연결된 범위

현재 실제 백엔드와 연결한 API는 아래와 같다.

- `GET /api/calendar/events`
- `POST /api/calendar/events`
- `PUT /api/calendar/events/{eventId}`
- `PATCH /api/calendar/events/{eventId}/confirm`
- `DELETE /api/calendar/events/{eventId}`

현재 연결 기준으로 실제 저장/수정되는 필드는 아래 3개다.

- `title`
- `start_datetime`
- `end_datetime`

상태 관련으로는 아래 값이 실제 응답에 포함된다.

- `source`
- `status`
- `is_calendar_added`
- `email_id`

## 2. 프론트 UI에는 있지만 백엔드에 없는 항목

현재 사용자 캘린더 UI에는 아래 정보가 존재한다.

- 일정 유형
  - `meeting`
  - `video`
  - `call`
  - `deadline`
- 장소 또는 회의 링크
- 참석자 목록
- 메모
- 원본 이메일 발신자명
- 원본 이메일 제목
- 캘린더 상세 패널용 보강 정보

하지만 현재 백엔드 `CalendarEventRequest`, `CalendarEventResponse`, `CalendarEventDetailResponse`에는 위 값들이 없다.

즉, 현재 백엔드가 직접 관리하는 데이터는 사실상 아래 수준이다.

- 일정 제목
- 시작 일시
- 종료 일시
- 이메일 연계 여부
- 상태값

## 3. 백엔드에 필요한 API 응답 확장

현재 프론트 흐름을 온전히 지원하려면 최소한 아래 응답 필드가 추가되어야 한다.

### 3.1 일정 상세 조회 응답

현재:

- `event_id`
- `title`
- `start_datetime`
- `end_datetime`
- `source`
- `status`
- `is_calendar_added`
- `email_id`
- `created_at`
- `updated_at`

추가 필요:

- `event_type`
- `location`
- `notes`
- `attendees`

권장 응답 예시:

```json
{
  "event_id": 12,
  "title": "그린에너지 파트너십 미팅",
  "start_datetime": "2026-04-10T10:00:00",
  "end_datetime": "2026-04-10T11:30:00",
  "event_type": "meeting",
  "location": "본사 3층 회의실 A",
  "notes": "전략적 파트너십 논의",
  "attendees": [
    {
      "name": "최영호",
      "email": "youngho.choi@greenenergy.kr",
      "company": "그린에너지"
    }
  ],
  "source": "EMAIL",
  "status": "PENDING",
  "is_calendar_added": false,
  "email_id": 301,
  "created_at": "2026-04-04T12:00:00",
  "updated_at": "2026-04-04T12:30:00"
}
```

### 3.2 일정 목록 조회 응답

월간 캘린더와 우측 패널을 안정적으로 그리려면 목록 응답에도 아래 중 일부가 있으면 좋다.

- `event_type`
- `location`
- `notes`
- `attendees_count`
- `email_summary`

최소 권장:

- `event_type`
- `location`

## 4. 원본 이메일 연결 정보에 필요한 API 확장

현재 응답에는 `email_id`만 있다.

하지만 프론트 상세 패널과 “이메일에서 감지된 일정” 카드 흐름을 유지하려면 아래 값이 필요하다.

- `email_sender_name`
- `email_subject`

또는 아래처럼 객체로 주는 편이 낫다.

```json
{
  "linked_email": {
    "email_id": 301,
    "sender_name": "최영호",
    "subject": "3월 파트너십 미팅 요청"
  }
}
```

## 5. 백엔드에 필요한 요청 스펙 확장

현재 `CalendarEventRequest`는 아래만 받는다.

- `title`
- `startDatetime`
- `endDatetime`

프론트 UI 기준으로는 아래 값도 받아야 한다.

- `eventType`
- `location`
- `notes`
- `attendees`

권장 요청 예시:

```json
{
  "title": "그린에너지 파트너십 미팅",
  "startDatetime": "2026-04-10T10:00:00",
  "endDatetime": "2026-04-10T11:30:00",
  "eventType": "meeting",
  "location": "본사 3층 회의실 A",
  "notes": "전략적 파트너십 논의",
  "attendees": [
    {
      "name": "최영호",
      "email": "youngho.choi@greenenergy.kr",
      "company": "그린에너지"
    }
  ]
}
```

## 6. DB에 필요한 컬럼 및 테이블

현재 `CalendarEvents` 엔티티 기준으로 없는 값은 아래다.

- 일정 유형
- 장소
- 메모
- 참석자

### 6.1 `CalendarEvents` 테이블에 필요한 컬럼

추가 권장 컬럼:

- `event_type VARCHAR(30) NOT NULL`
- `location VARCHAR(255) NULL`
- `notes TEXT NULL`

### 6.2 참석자 저장 방식

참석자는 별도 테이블로 분리하는 편이 안전하다.

권장 테이블:

- `CalendarEventAttendees`

권장 컬럼:

- `attendee_id BIGINT PK`
- `event_id BIGINT FK`
- `name VARCHAR(100) NOT NULL`
- `email VARCHAR(255) NULL`
- `company VARCHAR(150) NULL`

이유:

- 참석자가 여러 명일 수 있음
- 추후 외부 캘린더 연동 시 구조 확장이 쉬움
- 검색/집계/동기화에 유리함

## 7. 프론트 기준으로 아직 보류된 동작

현재 프론트 캘린더 흐름 중 아래는 완전 연결되지 않았다.

- 장소 저장
- 참석자 저장
- 메모 저장
- 원본 이메일 발신자/제목 직접 표시
- 일정 유형을 백엔드 원본값으로 저장/수정

현재는 연결 가능한 범위만 실제 API에 반영하고, 나머지는 화면 보조 정보 또는 데모 데이터로 유지한다.

## 8. 백엔드 우선 작업 순서

1. `CalendarEventRequest`와 응답 DTO에 `event_type`, `location`, `notes` 추가
2. `CalendarEvents` 테이블에 `event_type`, `location`, `notes` 컬럼 추가
3. `CalendarEventAttendees` 테이블 추가
4. 상세 응답에 `linked_email.sender_name`, `linked_email.subject` 추가
5. 목록 응답에 `event_type`, `location` 추가

이 5단계가 완료되면 현재 프론트 캘린더 UI 흐름과 거의 1:1로 맞출 수 있다.
