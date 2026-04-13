import { Building2, CalendarDays, Inbox, LayoutGrid, Mail, Settings, Sparkles } from "lucide-react";

export const navigationGroups = [
  {
    id: "primary",
    items: [
      { to: "/app", label: "대시보드", icon: LayoutGrid, end: true },
      { to: "/app/inbox", label: "수신함", icon: Inbox },
      { to: "/app/calendar", label: "캘린더", icon: CalendarDays },
      { to: "/app/templates", label: "템플릿 라이브러리", icon: Mail },
      { to: "/app/profile", label: "비즈니스 프로필", icon: Building2 },
      { to: "/app/automation", label: "자동화 설정", icon: Sparkles },
    ],
  },
  {
    id: "secondary",
    items: [{ to: "/app/settings", label: "설정", icon: Settings }],
  },
];
