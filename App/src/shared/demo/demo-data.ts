import type { NotificationItem } from "../types";

export const demoNotifications: NotificationItem[] = [
  {
    id: "demo-notification-1",
    type: "draft",
    title: "답변 초안 3건이 검토 대기 중입니다",
    content: "가격 문의와 미팅 제안 메일에 대한 초안이 생성되었습니다.",
    time: "방금 전",
    actionLabel: "수신함 보기",
    actionPath: "/app/inbox",
    read: false,
    tone: "teal",
  },
  {
    id: "demo-notification-2",
    type: "calendar",
    title: "내일 오전 미팅 일정이 감지되었습니다",
    content: "그린에너지 파트너십 미팅이 캘린더 대기 목록에 추가되었습니다.",
    time: "10분 전",
    actionLabel: "캘린더 보기",
    actionPath: "/app/calendar",
    read: false,
    tone: "amber",
  },
  {
    id: "demo-notification-3",
    type: "template",
    title: "템플릿 재생성이 완료되었습니다",
    content: "가격 문의 카테고리 템플릿 4개가 최신 프로필 기준으로 갱신되었습니다.",
    time: "오늘 09:20",
    actionLabel: "템플릿 보기",
    actionPath: "/app/templates",
    read: true,
    tone: "teal",
  },
];
