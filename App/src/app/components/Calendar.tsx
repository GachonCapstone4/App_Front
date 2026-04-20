import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  MapPin,
  Users,
  Mail,
  CalendarDays,
  CalendarCheck,
  Video,
  MoreHorizontal,
  X,
  ExternalLink,
  Sparkles,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Calendar as DatePickerCalendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  confirmCalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  type CalendarEventSnapshot,
  updateCalendarEvent,
} from "../../shared/api/calendar";
import { getInboxDetail, getInboxList } from "../../shared/api/inbox";
import { getErrorMessage } from "../../shared/api/http";
import { AppStatePage } from "../../shared/ui/primitives/AppStatePage";
import { StateBanner } from "../../shared/ui/primitives/StateBanner";
import { StatePanel } from "../../shared/ui/primitives/StatePanel";
import { mapInboxListItem, mergeInboxDetail } from "./inbox.helpers";
import {
  type CalendarEventType,
  getCalendarMonthRange,
  inferCalendarEventType,
  isEndTimeBeforeStartTime,
  splitCalendarDateTime,
  toCalendarApiDateTime,
} from "./calendar.helpers";
import type { EmailItem } from "../../shared/types";

export interface CalendarEvent {
  id: string;
  eventId?: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  location?: string;
  attendees: { name: string; email: string; company: string }[];
  fromEmail?: { sender: string; subject: string; id: string };
  color: string;
  confirmed: boolean;
  notes?: string;
  source?: string | null;
  status?: string | null;
  isCalendarAdded?: boolean;
}

interface CalendarEventDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEvent["type"];
  location: string;
  attendeesText: string;
  notes: string;
}

interface CalendarEmailCandidate {
  emailId: string;
  sender: string;
  subject: string;
  title: string;
  date: string;
  time: string;
  linkedEventId?: string;
  isRegistered: boolean;
}

const initialEvents: CalendarEvent[] = [
  {
    id: "e1",
    title: "테크솔루션 엔터프라이즈 플랜 상담",
    date: "2026-03-04",
    startTime: "14:00",
    endTime: "15:00",
    type: "video",
    location: "Zoom 화상회의",
    attendees: [
      { name: "박민수", email: "minsu.park@techsolution.co.kr", company: "(주)테크솔루션" },
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    fromEmail: { sender: "박민수", subject: "엔터프라이즈 플랜 가격 문의", id: "1" },
    color: "#3B82F6",
    confirmed: true,
    notes: "엔터프라이즈 플랜 가격, 50인 팀 할인, Google Workspace 연동 논의",
  },
  {
    id: "e2",
    title: "그린에너지 파트너십 미팅",
    date: "2026-03-05",
    startTime: "10:00",
    endTime: "11:30",
    type: "meeting",
    location: "본사 3층 회의실 A",
    attendees: [
      { name: "최영호", email: "youngho.choi@greenenergy.kr", company: "그린에너지" },
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
      { name: "이소라", email: "sora.lee@mycompany.co.kr", company: "우리회사" },
    ],
    fromEmail: { sender: "최영호", subject: "3월 파트너십 미팅 요청", id: "3" },
    color: "#8B5CF6",
    confirmed: false,
    notes: "전략적 파트너십 논의, 공동 마케팅 방안 검토",
  },
  {
    id: "e3",
    title: "디자인랩 계약 갱신 미팅",
    date: "2026-03-07",
    startTime: "15:00",
    endTime: "16:00",
    type: "video",
    location: "Google Meet",
    attendees: [
      { name: "정하나", email: "hana.jung@designlab.kr", company: "디자인랩" },
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    fromEmail: { sender: "정하나", subject: "계약서 수정 요청 건", id: "4" },
    color: "#10B981",
    confirmed: true,
  },
  {
    id: "e4",
    title: "주간 팀 미팅",
    date: "2026-03-02",
    startTime: "09:00",
    endTime: "09:30",
    type: "call",
    attendees: [
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    color: "#F59E0B",
    confirmed: true,
  },
  {
    id: "e5",
    title: "스마트물류 후속 미팅",
    date: "2026-03-10",
    startTime: "11:00",
    endTime: "12:00",
    type: "meeting",
    location: "본사 2층 회의실 B",
    attendees: [
      { name: "이지은", email: "jieun.lee@smartlogis.com", company: "스마트물류" },
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    fromEmail: { sender: "이지은", subject: "배송 지연 관련 불만 접수", id: "2" },
    color: "#EF4444",
    confirmed: false,
    notes: "배송 지연 이슈 후속 조치 및 보상 방안 논의",
  },
  {
    id: "e6",
    title: "신규 서비스 론칭 프레젠테이션",
    date: "2026-03-12",
    startTime: "14:00",
    endTime: "16:00",
    type: "video",
    location: "Zoom 웨비나",
    attendees: [
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    color: "#EC4899",
    confirmed: true,
  },
  {
    id: "e7",
    title: "퀀텀소프트 기술 지원 콜",
    date: "2026-03-02",
    startTime: "14:00",
    endTime: "14:30",
    type: "call",
    attendees: [
      { name: "한승우", email: "seungwoo@quantumsoft.kr", company: "퀀텀소프트" },
      { name: "김호진", email: "jisoo.kim@mycompany.co.kr", company: "우리회사" },
    ],
    fromEmail: { sender: "한승우", subject: "API 연동 기술 미팅 요청", id: "5" },
    color: "#6366F1",
    confirmed: true,
  },
  {
    id: "e8",
    title: "월간 성과 보고 마감",
    date: "2026-03-14",
    startTime: "18:00",
    endTime: "18:00",
    type: "deadline",
    attendees: [],
    color: "#EF4444",
    confirmed: true,
  },
];

const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KR = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function draftFromEvent(event: CalendarEvent): CalendarEventDraft {
  return {
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    type: event.type,
    location: event.location || "",
    attendeesText: event.attendees.map((attendee) => attendee.name).join(", "),
    notes: event.notes || "",
  };
}

function buildAttendees(attendeesText: string) {
  return attendeesText
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      name,
      email: `guest${index + 1}@example.com`,
      company: "외부 참석자",
    }));
}

function mapSnapshotToEvent(snapshot: CalendarEventSnapshot): CalendarEvent {
  const start = splitCalendarDateTime(snapshot.startDatetime, "00:00");
  const end = splitCalendarDateTime(
    snapshot.endDatetime ?? snapshot.startDatetime,
    start.time,
  );
  const normalizedType = inferCalendarEventType(snapshot.title);
  const confirmed = snapshot.status === "CONFIRMED";

  return {
    id: String(snapshot.eventId),
    eventId: snapshot.eventId,
    title: snapshot.title,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    type: normalizedType,
    attendees: [],
    color: colorByType[normalizedType],
    confirmed,
    source: snapshot.source,
    status: snapshot.status,
    isCalendarAdded: snapshot.isCalendarAdded,
    fromEmail: snapshot.emailId
      ? {
          id: String(snapshot.emailId),
          sender: `이메일 #${snapshot.emailId}`,
          subject: "연결된 원본 이메일",
        }
      : undefined,
  };
}

const colorByType: Record<CalendarEvent["type"], string> = {
  meeting: "#8B5CF6",
  call: "#F59E0B",
  video: "#3B82F6",
  deadline: "#EF4444",
};

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDateDisplay(value: string) {
  return format(parseDateValue(value), "yyyy년 M월 d일 (EEE)", { locale: ko });
}

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
}

function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <label className="min-w-0 space-y-2 text-sm text-foreground">
      <span>날짜</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="app-picker-trigger flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{formatDateDisplay(value)}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-2xl border border-border bg-card p-0 shadow-xl"
        >
          <DatePickerCalendar
            mode="single"
            selected={parseDateValue(value)}
            classNames={{
              day_selected:
                "bg-[#1E2A3A] text-white hover:bg-[#1E2A3A] hover:text-white focus:bg-[#1E2A3A] focus:text-white dark:bg-[#0F766E] dark:text-[#ECFEFF] dark:hover:bg-[#0F766E] dark:hover:text-[#ECFEFF] dark:focus:bg-[#0F766E] dark:focus:text-[#ECFEFF]",
              day_today:
                "bg-[#E2E8F0] text-[#1E2A3A] dark:bg-[#182235] dark:text-foreground",
            }}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              onChange(toDateValue(date));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </label>
  );
}

interface TimePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <label className="min-w-0 space-y-2 text-sm text-foreground">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="app-picker-trigger flex h-11 w-full items-center justify-between rounded-xl px-4 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium tabular-nums">{value}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[260px] rounded-2xl border border-border bg-card p-3 shadow-xl"
        >
          <p className="mb-3 text-xs font-medium text-muted-foreground">{label} 시간 선택</p>
          <div className="scrollbar-soft max-h-60 overflow-y-auto overscroll-contain pr-1">
            <div className="grid grid-cols-3 gap-2">
              {timeOptions.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    onChange(time);
                    setOpen(false);
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium tabular-nums transition ${
                    value === time
                      ? "app-selected-surface text-foreground"
                      : "app-picker-option border-transparent"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {value === time ? <Check className="h-3.5 w-3.5" /> : null}
                    {time}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </label>
  );
}

interface CalendarProps {
  scenarioId?: string | null;
}

export function Calendar({ scenarioId }: CalendarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const loadErrorScenario = scenarioId === "calendar-load-error";
  const emptyScenario = scenarioId === "calendar-empty";
  const syncErrorScenario = scenarioId === "calendar-sync-error";
  const createNormalScenario = scenarioId === "calendar-create-normal";
  const editNormalScenario = scenarioId === "calendar-edit-normal";
  const deleteNormalScenario = scenarioId === "calendar-delete-normal";
  const createErrorScenario = scenarioId === "calendar-create-error";
  const useDemoDataMode = Boolean(scenarioId?.startsWith("calendar-"));
  const todayDate = new Date();
  const today = format(todayDate, "yyyy-MM-dd");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentYear, setCurrentYear] = useState(useDemoDataMode ? 2026 : todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(useDemoDataMode ? 2 : todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(useDemoDataMode ? "2026-03-02" : today);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [draft, setDraft] = useState<CalendarEventDraft>({
    title: "",
    date: useDemoDataMode ? "2026-03-02" : today,
    startTime: "09:00",
    endTime: "10:00",
    type: "meeting",
    location: "",
    attendeesText: "",
    notes: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(!useDemoDataMode);
  const [emailCandidates, setEmailCandidates] = useState<EmailItem[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(!useDemoDataMode);
  const [candidateLoadError, setCandidateLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const visibleEvents = emptyScenario ? [] : events;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const trailingDays = Math.max(0, 42 - (firstDay + daysInMonth));

  const selectedEvent =
    visibleEvents.find((event) => event.id === selectedEventId) || null;

  async function loadEvents() {
    if (useDemoDataMode) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const range = getCalendarMonthRange(currentYear, currentMonth);
      const snapshots = await getCalendarEvents({
        startDate: range.start,
        endDate: range.end,
      });
      const mappedEvents = snapshots.map(mapSnapshotToEvent);

      setEvents(mappedEvents);
    } catch (error) {
      setLoadError(getErrorMessage(error, "캘린더를 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEmailCandidates() {
    if (useDemoDataMode) {
      return;
    }

    setIsLoadingCandidates(true);
    setCandidateLoadError(null);

    try {
      const listResponse = await getInboxList({ size: 100 });
      const detectedEmails = (listResponse.content ?? []).filter((item) => item.schedule_detected);
      const mappedDetectedEmails = detectedEmails.map(mapInboxListItem);

      if (!mappedDetectedEmails.length) {
        setEmailCandidates([]);
        return;
      }

      const detailResults = await Promise.allSettled(
        mappedDetectedEmails.map(async (item) => {
          const detail = await getInboxDetail(Number(item.id));
          return mergeInboxDetail(item, detail);
        }),
      );

      const hydratedCandidates = detailResults
        .filter(
          (result): result is PromiseFulfilledResult<EmailItem> => result.status === "fulfilled",
        )
        .map((result) => result.value)
        .filter((item) => item.schedule.detected);

      setEmailCandidates(hydratedCandidates);
    } catch (error) {
      setCandidateLoadError(getErrorMessage(error, "이메일 일정 후보를 불러오지 못했습니다."));
    } finally {
      setIsLoadingCandidates(false);
    }
  }

  useEffect(() => {
    if (useDemoDataMode) {
      setEvents(initialEvents);
      setIsLoading(false);
      setLoadError(null);
      setEmailCandidates([]);
      setIsLoadingCandidates(false);
      setCandidateLoadError(null);
      return;
    }

    void loadEvents();
  }, [currentMonth, currentYear, useDemoDataMode]);

  useEffect(() => {
    if (useDemoDataMode) {
      return;
    }

    void loadEmailCandidates();
  }, [useDemoDataMode]);

  useEffect(() => {
    const state = location.state as
      | {
          prefillEvent?: Partial<CalendarEvent> & {
            title: string;
            date: string;
            startTime: string;
            endTime: string;
            type: CalendarEvent["type"];
            location?: string;
            notes?: string;
            fromEmail?: CalendarEvent["fromEmail"];
          };
          autoSubmit?: boolean;
        }
      | null;

    if (!state?.prefillEvent) {
      return;
    }

    const prefillDraft: CalendarEventDraft = {
      title: state.prefillEvent.title,
      date: state.prefillEvent.date,
      startTime: state.prefillEvent.startTime,
      endTime: state.prefillEvent.endTime,
      type: state.prefillEvent.type,
      location: state.prefillEvent.location || "",
      attendeesText: state.prefillEvent.fromEmail?.sender || "",
      notes: state.prefillEvent.notes || "",
    };

    setSelectedDate(prefillDraft.date);

    const submitPrefill = async () => {
      if (useDemoDataMode) {
        const newEvent: CalendarEvent = {
          id: String(Date.now()),
          title: prefillDraft.title,
          date: prefillDraft.date,
          startTime: prefillDraft.startTime,
          endTime: prefillDraft.endTime,
          type: prefillDraft.type,
          location: prefillDraft.location,
          attendees: buildAttendees(prefillDraft.attendeesText),
          fromEmail: state.prefillEvent?.fromEmail,
          color: colorByType[prefillDraft.type],
          confirmed: false,
          notes: prefillDraft.notes,
        };
        setEvents((current) => [newEvent, ...current]);
        setSelectedEventId(newEvent.id);
        toast.success("일정을 캘린더에 추가했습니다.");
        return;
      }

      try {
        const createdEvent = await createCalendarEvent({
          title: prefillDraft.title,
          startDatetime: toCalendarApiDateTime(prefillDraft.date, prefillDraft.startTime),
          endDatetime: toCalendarApiDateTime(prefillDraft.date, prefillDraft.endTime),
        });
        const mappedEvent = {
          ...mapSnapshotToEvent(createdEvent),
          location: prefillDraft.location,
          attendees: buildAttendees(prefillDraft.attendeesText),
          notes: prefillDraft.notes,
          fromEmail: state.prefillEvent?.fromEmail,
        };

        setEvents((current) => [mappedEvent, ...current]);
        setSelectedEventId(mappedEvent.id);
        toast.success("일정을 캘린더에 추가했습니다.");
      } catch (error) {
        toast.error(getErrorMessage(error, "일정을 추가하지 못했습니다."));
      }
    };

    if (state.autoSubmit) {
      void submitPrefill();
    } else {
      setDraft(prefillDraft);
      setEditorMode("create");
      setEditorOpen(true);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, useDemoDataMode]);

  useEffect(() => {
    if (!useDemoDataMode) {
      return;
    }

    if (createNormalScenario) {
      setSelectedDate("2026-03-12");
      setSelectedEventId(null);
      setEditorMode("create");
      setDraft({
        title: "에이전시 데모 미팅",
        date: "2026-03-12",
        startTime: "10:00",
        endTime: "11:00",
        type: "video",
        location: "Google Meet",
        attendeesText: "윤서영, 김호진",
        notes: "도입 검토용 제품 데모와 가격 정책 안내",
      });
      setEditorOpen(true);
      return;
    }

    if (editNormalScenario) {
      const targetEvent = initialEvents[1];
      setSelectedDate(targetEvent.date);
      setSelectedEventId(targetEvent.id);
      setEditorMode("edit");
      setDraft(draftFromEvent(targetEvent));
      setEditorOpen(true);
      return;
    }

    if (deleteNormalScenario) {
      const targetEvent = initialEvents[1];
      setSelectedDate(targetEvent.date);
      setSelectedEventId(targetEvent.id);
      setEditorOpen(false);
      setDeleteTarget(targetEvent);
      return;
    }

    if (!createErrorScenario) {
      return;
    }

    setSelectedDate("2026-03-12");
    setEditorMode("create");
    setDraft({
      title: "그린에너지 후속 미팅",
      date: "2026-03-12",
      startTime: "14:00",
      endTime: "15:00",
      type: "meeting",
      location: "본사 3층 회의실 A",
      attendeesText: "최영호, 김호진",
      notes: "계약 조건 후속 협의",
    });
    setEditorOpen(true);
  }, [createErrorScenario, createNormalScenario, deleteNormalScenario, editNormalScenario, useDemoDataMode]);

  const changeMonth = (direction: number) => {
    const nextDate = new Date(currentYear, currentMonth + direction, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth();
    const nextMonthDays = getDaysInMonth(nextYear, nextMonth);
    const currentDay = selectedDate ? Number(selectedDate.slice(-2)) : 1;
    const nextDay = Math.min(currentDay || 1, nextMonthDays);

    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
    setSelectedDate(formatDate(nextYear, nextMonth, nextDay));
    setSelectedEventId(null);
  };

  const getEventsForDate = (dateStr: string) =>
    visibleEvents.filter((event) => event.date === dateStr);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const emailLinkedEvents = useMemo(
    () => visibleEvents.filter((event) => event.fromEmail),
    [visibleEvents],
  );
  const monthlyEmailCandidates = useMemo<CalendarEmailCandidate[]>(() => {
    if (useDemoDataMode) {
      return emailLinkedEvents
        .flatMap((event) => {
          if (!event.fromEmail) {
            return [];
          }

          return [
            {
              emailId: event.fromEmail.id,
              sender: event.fromEmail.sender,
              subject: event.fromEmail.subject,
              title: event.title,
              date: event.date,
              time: event.startTime,
              linkedEventId: event.id,
              isRegistered: true,
            } satisfies CalendarEmailCandidate,
          ];
        });
    }

    return emailCandidates
      .flatMap((email) => {
        if (!email.schedule.detected) {
          return [];
        }

        const candidateDate = email.schedule.suggestedDate;
        const [candidateYear, candidateMonth] = candidateDate.split("-").map(Number);

        if (candidateYear !== currentYear || candidateMonth !== currentMonth + 1) {
          return [];
        }

        const linkedEvent = visibleEvents.find((event) => event.fromEmail?.id === email.id);

        return [
          {
            emailId: email.id,
            sender: email.sender,
            subject: email.subject,
            title: email.schedule.title,
            date: candidateDate,
            time: email.schedule.suggestedTime,
            linkedEventId: linkedEvent?.id,
            isRegistered: Boolean(linkedEvent),
          },
        ];
      })
      .sort((left, right) => {
        const leftKey = `${left.date} ${left.time}`;
        const rightKey = `${right.date} ${right.time}`;
        return leftKey.localeCompare(rightKey);
      });
  }, [currentMonth, currentYear, emailCandidates, emailLinkedEvents, useDemoDataMode, visibleEvents]);
  const pendingEvents = useMemo(
    () => visibleEvents.filter((event) => !event.confirmed),
    [visibleEvents],
  );

  const openEmailCandidate = (candidate: CalendarEmailCandidate) => {
    if (candidate.linkedEventId) {
      setSelectedDate(candidate.date);
      setSelectedEventId(candidate.linkedEventId);
      return;
    }

    const matchedEmail = emailCandidates.find((item) => item.id === candidate.emailId);
    if (!matchedEmail?.schedule.detected) {
      return;
    }

    setSelectedEventId(null);
    setSelectedDate(matchedEmail.schedule.suggestedDate);
    setDraft({
      title: matchedEmail.schedule.title,
      date: matchedEmail.schedule.suggestedDate,
      startTime: matchedEmail.schedule.suggestedTime,
      endTime: matchedEmail.schedule.suggestedTime,
      type: matchedEmail.schedule.type === "video" ? "video" : "meeting",
      location: matchedEmail.schedule.location,
      attendeesText: matchedEmail.sender,
      notes: `${matchedEmail.subject} 이메일에서 감지된 일정`,
    });
    setEditorMode("create");
    setEditorOpen(true);
  };

  const openCreateDialog = () => {
    setEditorMode("create");
    setDraft({
      title: "",
      date: selectedDate || today,
      startTime: "09:00",
      endTime: "10:00",
      type: "meeting",
      location: "",
      attendeesText: "",
      notes: "",
    });
    setEditorOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditorMode("edit");
    setSelectedEventId(event.id);
    setDraft(draftFromEvent(event));
    setEditorOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!draft.title.trim()) {
      toast.error("일정 제목을 입력하세요.");
      return;
    }

    if (isEndTimeBeforeStartTime(draft.startTime, draft.endTime)) {
      toast.error("종료 시간은 시작 시간 이후여야 합니다.");
      return;
    }

    if (createErrorScenario) {
      toast.error("일정을 저장하지 못했습니다.");
      return;
    }

    setIsSaving(true);

    try {
      if (editorMode === "edit" && selectedEvent) {
        if (useDemoDataMode || !selectedEvent.eventId) {
          setEvents((current) =>
            current.map((event) =>
              event.id === selectedEvent.id
                ? {
                    ...event,
                    title: draft.title.trim(),
                    date: draft.date,
                    startTime: draft.startTime,
                    endTime: draft.endTime,
                    type: draft.type,
                    location: draft.location,
                    attendees: buildAttendees(draft.attendeesText),
                    color: colorByType[draft.type],
                    notes: draft.notes,
                  }
                : event,
            ),
          );
        } else {
          const updatedEvent = await updateCalendarEvent(selectedEvent.eventId, {
            title: draft.title.trim(),
            startDatetime: toCalendarApiDateTime(draft.date, draft.startTime),
            endDatetime: toCalendarApiDateTime(draft.date, draft.endTime),
          });
          const mappedEvent = {
            ...mapSnapshotToEvent(updatedEvent),
            location: selectedEvent.location,
            attendees: selectedEvent.attendees,
            notes: selectedEvent.notes,
            fromEmail: selectedEvent.fromEmail,
          };

          setEvents((current) =>
            current.map((event) => (event.id === selectedEvent.id ? mappedEvent : event)),
          );
        }
        toast.success("일정을 수정했습니다.");
      } else if (useDemoDataMode) {
        const newEvent: CalendarEvent = {
          id: String(Date.now()),
          title: draft.title.trim(),
          date: draft.date,
          startTime: draft.startTime,
          endTime: draft.endTime,
          type: draft.type,
          location: draft.location,
          attendees: buildAttendees(draft.attendeesText),
          color: colorByType[draft.type],
          confirmed: draft.type === "deadline",
          notes: draft.notes,
        };
        setEvents((current) => [newEvent, ...current]);
        setSelectedEventId(newEvent.id);
        toast.success("새 일정을 추가했습니다.");
      } else {
        const createdEvent = await createCalendarEvent({
          title: draft.title.trim(),
          startDatetime: toCalendarApiDateTime(draft.date, draft.startTime),
          endDatetime: toCalendarApiDateTime(draft.date, draft.endTime),
        });
        const mappedEvent = {
          ...mapSnapshotToEvent(createdEvent),
          location: draft.location,
          attendees: buildAttendees(draft.attendeesText),
          notes: draft.notes,
        };

        setEvents((current) => [mappedEvent, ...current]);
        setSelectedEventId(mappedEvent.id);
        toast.success("새 일정을 추가했습니다.");
      }

      setSelectedDate(draft.date);
      setEditorOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "일정을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmEvent = async () => {
    if (!selectedEvent) {
      return;
    }

    if (useDemoDataMode || !selectedEvent.eventId) {
      setEvents((current) =>
        current.map((event) =>
          event.id === selectedEvent.id ? { ...event, confirmed: true } : event,
        ),
      );
      toast.success("일정을 확정했습니다.");
      return;
    }

    setIsConfirming(true);

    try {
      const confirmedEvent = await confirmCalendarEvent(selectedEvent.eventId);
      const mappedEvent = {
        ...mapSnapshotToEvent(confirmedEvent),
        location: selectedEvent.location,
        attendees: selectedEvent.attendees,
        notes: selectedEvent.notes,
        fromEmail: selectedEvent.fromEmail,
      };

      setEvents((current) =>
        current.map((event) => (event.id === selectedEvent.id ? mappedEvent : event)),
      );
      toast.success("일정을 확정했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "일정을 확정하지 못했습니다."));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteTarget) {
      return;
    }

    if (useDemoDataMode || !deleteTarget.eventId) {
      setEvents((current) =>
        current.filter((event) => event.id !== deleteTarget.id),
      );
      if (selectedEventId === deleteTarget.id) {
        setSelectedEventId(null);
      }
      toast.success("일정을 삭제했습니다.");
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteCalendarEvent(deleteTarget.eventId);
      setEvents((current) =>
        current.filter((event) => event.id !== deleteTarget.id),
      );
      if (selectedEventId === deleteTarget.id) {
        setSelectedEventId(null);
      }
      toast.success("일정을 삭제했습니다.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "일정을 삭제하지 못했습니다."));
    } finally {
      setIsDeleting(false);
    }
  };

  const openMeetingLink = () => {
    if (!selectedEvent) {
      return;
    }

    window.open(
      `https://calendar.google.com/calendar/u/0/r/eventedit/${selectedEvent.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (loadErrorScenario) {
    return (
      <AppStatePage
        title="캘린더를 불러오지 못했습니다"
        description="일정 목록과 상세 데이터를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  if (loadError) {
    return (
      <AppStatePage
        title="캘린더를 불러오지 못했습니다"
        description={loadError}
        action={
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="app-cta-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            다시 시도
          </button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col bg-background lg:flex-row">
        <div className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
          {useDemoDataMode ? (
            <StateBanner
              title="데모 데이터 모드"
              description="시나리오용 목업 일정을 유지하고 있습니다. 실제 백엔드 연결 상태는 일반 진입 경로에서 확인할 수 있습니다."
              tone="info"
              className="mb-5"
            />
          ) : null}

          {!useDemoDataMode ? (
            <StateBanner
              title="현재 연결된 캘린더 범위"
              description="실제 백엔드에는 제목, 시작 시간, 종료 시간, 확정 상태만 저장됩니다. 장소, 참석자, 메모는 현재 화면 보조 정보이며 아직 서버에는 저장되지 않습니다."
              tone="warning"
              className="mb-5"
            />
          ) : null}

          {syncErrorScenario ? (
            <StateBanner
              title="Google Calendar 동기화에 문제가 있습니다"
              description="연결은 유지되지만 최근 변경 사항을 불러오지 못했습니다. 다시 동기화하거나 수동으로 일정을 추가해 주세요."
              tone="error"
              className="mb-5"
            />
          ) : null}

          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            {pendingEvents.length > 0 ? (
              <div className="app-warning-card flex items-start gap-3 rounded-xl border p-4 lg:max-w-[640px]">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15 dark:bg-[#2F220F]">
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <p className="mb-0.5 text-[13px]">
                    확인 대기 중인 일정이 {pendingEvents.length}건 있습니다
                  </p>
                  <p className="app-warning-subtle text-[11px]">
                    이메일에서 AI가 감지한 일정입니다. 확인하고 캘린더에 확정하세요.
                  </p>
                </div>
              </div>
            ) : null}

            <button
              onClick={openCreateDialog}
              className={`app-cta-accent flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-sm ${
                pendingEvents.length > 0 ? "self-start lg:self-auto" : "self-end"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[13px]">일정 추가</span>
            </button>
          </div>

          <div className="w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-card shadow-sm dark:border-border">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4 dark:border-border">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-2 text-[#64748B] transition-colors hover:bg-[#F1F5F9] dark:text-muted-foreground dark:hover:bg-[#1E293B]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-[#1E2A3A] dark:text-foreground">
                {currentYear}년 {MONTHS_KR[currentMonth]}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                className="rounded-lg p-2 text-[#64748B] transition-colors hover:bg-[#F1F5F9] dark:text-muted-foreground dark:hover:bg-[#1E293B]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid w-full grid-cols-7 bg-[#F8FAFC] dark:bg-[#111A28]">
              {DAYS_KR.map((day) => (
                <div
                  key={day}
                  className={`py-2.5 text-center text-[12px] ${
                    day === "일"
                      ? "text-[#EF4444]"
                      : day === "토"
                        ? "text-[#3B82F6]"
                        : "text-[#94A3B8]"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid w-full grid-cols-7">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="h-[92px] border-r border-t border-[#F1F5F9] bg-[#FAFBFC] dark:border-border dark:bg-[#101826] lg:h-[112px]"
                />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const dateStr = formatDate(currentYear, currentMonth, day);
                const dayEvents = getEventsForDate(dateStr);
                const visibleDayEvents = dayEvents.slice(0, 2);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const dayOfWeek = (firstDay + index) % 7;

                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setSelectedEventId(null);
                    }}
                    className={`relative h-[92px] border-r border-t border-[#F1F5F9] p-1.5 text-left transition-colors dark:border-border lg:h-[112px] ${
                      isSelected
                        ? "bg-[#2DD4BF]/5 ring-2 ring-inset ring-[#2DD4BF]/30 dark:bg-[#0B2728] dark:ring-[#115E59]"
                        : "hover:bg-[#F8FAFC] dark:hover:bg-[#131D2F]"
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${
                        isToday
                          ? "bg-[#1E2A3A] text-white dark:bg-[#18263A]"
                          : dayOfWeek === 0
                            ? "text-[#EF4444]"
                            : dayOfWeek === 6
                              ? "text-[#3B82F6]"
                              : "text-[#1E2A3A] dark:text-foreground"
                      }`}
                    >
                      {day}
                    </span>

                    <div className="mt-1 flex min-h-[38px] flex-col gap-0.5">
                      {visibleDayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex h-[17px] cursor-pointer items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${event.color}15`,
                            color: event.color,
                          }}
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            setSelectedEventId(event.id);
                            setSelectedDate(event.date);
                          }}
                        >
                          <span className="flex w-2.5 shrink-0 items-center justify-center">
                            {event.fromEmail ? (
                              <Mail className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <span className="h-2.5 w-2.5 opacity-0" />
                            )}
                          </span>
                          <span className="flex w-1.5 shrink-0 items-center justify-center">
                            {!event.confirmed ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            ) : (
                              <span className="h-1.5 w-1.5 opacity-0" />
                            )}
                          </span>
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 ? (
                        <span className="px-1.5 text-[10px] text-[#94A3B8] dark:text-muted-foreground">
                          +{dayEvents.length - 2}개 더
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}

              {Array.from({ length: trailingDays }).map((_, index) => (
                <div
                  key={`trailing-${index}`}
                  className="h-[92px] border-r border-t border-[#F1F5F9] bg-[#FAFBFC] dark:border-border dark:bg-[#101826] lg:h-[112px]"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="scrollbar-none min-h-0 shrink-0 overflow-y-auto border-l border-[#E2E8F0] bg-card dark:border-border lg:w-[360px] xl:w-[400px]">
          {selectedEvent ? (
            <div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] p-4 dark:border-border">
                <h3 className="text-[14px] text-[#1E2A3A] dark:text-foreground">일정 상세</h3>
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] dark:text-muted-foreground dark:hover:bg-[#1E293B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedEvent.color }}
                    />
                    {!selectedEvent.confirmed ? (
                      <span className="app-warning-pill rounded-full px-2 py-0.5 text-[10px]">
                        확인 대기
                      </span>
                    ) : (
                      <span className="app-success-pill rounded-full px-2 py-0.5 text-[10px]">
                        확정됨
                      </span>
                    )}
                  </div>
                  <h2 className="mb-1 text-[#1E2A3A] dark:text-foreground">{selectedEvent.title}</h2>
                </div>

                <div className="app-soft-surface flex items-center gap-3 rounded-lg p-3">
                  <Clock className="h-4 w-4 text-[#64748B] dark:text-muted-foreground" />
                  <div>
                    <p className="text-[13px] text-[#1E2A3A] dark:text-foreground">
                      {selectedEvent.date.replace(/-/g, ".")} {selectedEvent.startTime} - {selectedEvent.endTime}
                    </p>
                  </div>
                </div>

                {selectedEvent.location ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8] dark:text-muted-foreground" />
                    <div>
                      <p className="text-[13px] text-[#1E2A3A] dark:text-foreground">
                        {selectedEvent.location}
                      </p>
                      {selectedEvent.type === "video" ? (
                        <button
                          onClick={openMeetingLink}
                          className="app-accent-text mt-1 flex items-center gap-1 text-[11px] hover:text-[#14B8A6] dark:hover:text-[#7CEBDB]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          회의 링크 열기
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {selectedEvent.fromEmail ? (
                  <div className="app-selected-surface rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Mail className="app-accent-text h-3.5 w-3.5" />
                      <span className="app-accent-text text-[11px]">
                        이메일에서 감지된 일정
                      </span>
                    </div>
                    <p className="text-[12px] text-[#1E2A3A] dark:text-foreground">
                      {selectedEvent.fromEmail.sender}
                    </p>
                    <p className="truncate text-[11px] text-[#64748B] dark:text-muted-foreground">
                      "{selectedEvent.fromEmail.subject}"
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/app/inbox")}
                      className="app-accent-text mt-2 text-[11px] underline-offset-4 hover:underline"
                    >
                      원본 이메일 보기
                    </button>
                  </div>
                ) : null}

                {selectedEvent.notes ? (
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-[#94A3B8] dark:text-muted-foreground">
                      메모
                    </p>
                    <p className="text-[12px] leading-relaxed text-[#64748B] dark:text-muted-foreground">
                      {selectedEvent.notes}
                    </p>
                  </div>
                ) : null}

                {!useDemoDataMode && (!selectedEvent.location || !selectedEvent.notes) ? (
                  <StateBanner
                    title="일부 상세 정보는 아직 백엔드와 연결되지 않았습니다"
                    description="현재 API 응답에는 장소와 메모가 포함되지 않아 이 일정에서는 표시되지 않을 수 있습니다."
                    tone="neutral"
                  />
                ) : null}

                <div className="flex gap-2 border-t border-[#F1F5F9] pt-3 dark:border-border">
                  {!selectedEvent.confirmed ? (
                    <>
                      <button
                        onClick={() => void handleConfirmEvent()}
                        disabled={isConfirming}
                        className="app-cta-accent flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px]"
                      >
                        <CalendarCheck className="h-4 w-4" />
                        {isConfirming ? "확정 중..." : "일정 확정"}
                      </button>
                      <button
                        onClick={() => openEditDialog(selectedEvent)}
                        className="app-secondary-button rounded-lg px-4 py-2.5 text-[13px]"
                      >
                        수정
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openEditDialog(selectedEvent)}
                        className="app-secondary-button flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px]"
                      >
                        <Pencil className="h-4 w-4" />
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteTarget(selectedEvent)}
                        className="app-danger-button rounded-lg px-4 py-2.5 text-[13px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-[#E2E8F0] p-4 dark:border-border">
                <h3 className="text-[14px] text-[#1E2A3A] dark:text-foreground">
                  {selectedDate ? `${selectedDate.replace(/-/g, ".")} 일정` : "날짜를 선택하세요"}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#94A3B8] dark:text-muted-foreground">
                  {selectedDateEvents.length > 0
                    ? `${selectedDateEvents.length}개 일정`
                    : "등록된 일정이 없습니다"}
                </p>
              </div>

              {selectedDateEvents.length === 0 ? (
                <div className="px-4 py-4">
                  <StatePanel
                    title="이 날짜에는 일정이 없습니다"
                    description="직접 추가하거나 이메일에서 감지된 일정을 등록할 수 있습니다."
                    tone="empty"
                    action={
                      <button
                        onClick={openCreateDialog}
                        className="app-cta-primary rounded-lg px-4 py-2 text-[12px]"
                      >
                        일정 추가
                      </button>
                    }
                    className="min-h-[220px]"
                  />
                </div>
              ) : null}

              <div className="divide-y divide-[#F1F5F9] dark:divide-border">
                {selectedDateEvents.map((event) => {
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full p-4 text-left transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#131D2F]"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 h-12 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            {!event.confirmed ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                            ) : null}
                            <span className="truncate text-[13px] text-[#1E2A3A] dark:text-foreground">
                              {event.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#94A3B8] dark:text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          {event.fromEmail ? (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#2DD4BF]/10 px-2 py-0.5 text-[10px] text-[#0D9488] dark:bg-[#0B2728] dark:text-[#5EEAD4]">
                              <Mail className="h-2.5 w-2.5" />
                              {event.fromEmail.sender}
                            </span>
                          ) : null}
                        </div>
                        <MoreHorizontal className="h-4 w-4 shrink-0 text-[#CBD5E1] dark:text-[#64748B]" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#E2E8F0] dark:border-border">
                <div className="px-4 pb-2 pt-4">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#94A3B8] dark:text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    이메일에서 감지된 일정
                  </p>
                </div>
                <div className="space-y-2 px-4 pb-4">
                  {!useDemoDataMode && isLoadingCandidates ? (
                    <StatePanel
                      title="이메일 일정 후보를 불러오는 중입니다"
                      description="일정이 감지된 메일을 현재 월 기준으로 정리하고 있습니다."
                      tone="neutral"
                      className="min-h-[180px]"
                    />
                  ) : candidateLoadError ? (
                    <StatePanel
                      title="이메일 일정 후보를 불러오지 못했습니다"
                      description={candidateLoadError}
                      tone="error"
                      className="min-h-[180px]"
                    />
                  ) : monthlyEmailCandidates.length > 0 ? (
                    monthlyEmailCandidates.slice(0, 6).map((candidate) => (
                      <button
                        key={`${candidate.emailId}-${candidate.date}-${candidate.time}`}
                        onClick={() => openEmailCandidate(candidate)}
                        className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-left transition-colors hover:border-[#CBD5E1] dark:border-border dark:bg-[#131D2F] dark:hover:border-[#475569]"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${candidate.isRegistered ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
                          <span className="flex-1 truncate text-[12px] text-[#1E2A3A] dark:text-foreground">
                            {candidate.title}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                              candidate.isRegistered
                                ? "app-success-pill"
                                : "app-warning-pill"
                            }`}
                          >
                            {candidate.isRegistered ? "등록됨" : "미등록"}
                          </span>
                        </div>
                        <p className="truncate text-[10px] text-[#64748B] dark:text-muted-foreground">
                          {candidate.sender} · "{candidate.subject}"
                        </p>
                        <p className="mt-1 text-[10px] text-[#94A3B8] dark:text-muted-foreground">
                          {candidate.date.replace(/-/g, ".")} {candidate.time}
                        </p>
                      </button>
                    ))
                  ) : (
                    <StatePanel
                      title="이메일에서 감지된 일정이 없습니다"
                      description="이메일 기반 일정 제안이 들어오면 이 영역에서 바로 확인할 수 있습니다."
                      tone="empty"
                      className="min-h-[180px]"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "edit" ? "일정 수정" : "일정 추가"}
            </DialogTitle>
            <DialogDescription>
              캘린더에 표시할 일정 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          {createErrorScenario ? (
            <StateBanner
              title="일정 저장을 완료하지 못했습니다"
              description="입력한 내용은 유지되었지만 저장 응답이 지연되고 있습니다. 다시 시도해 주세요."
              tone="error"
            />
          ) : null}

          {!useDemoDataMode ? (
            <StateBanner
              title="지금 저장되는 항목"
              description="실제 백엔드에는 제목, 날짜, 시작 시간, 종료 시간만 저장됩니다. 장소와 메모는 문서화된 미구현 항목으로 남겨두고 있습니다."
              tone="warning"
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-foreground">
              <span>제목</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                className="app-form-input h-11 w-full rounded-xl px-4 text-sm"
              />
            </label>

            <div className="grid gap-3 md:col-span-2 md:grid-cols-[1.1fr_1fr_1fr]">
              <DatePickerField
                value={draft.date}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    date: value,
                  }))
                }
              />
              <TimePickerField
                label="시작"
                value={draft.startTime}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    startTime: value,
                  }))
                }
              />
              <TimePickerField
                label="종료"
                value={draft.endTime}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    endTime: value,
                  }))
                }
              />
            </div>

            <label className="space-y-2 text-sm text-foreground md:col-span-2">
              <span>장소 또는 링크</span>
              <input
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
                disabled={!useDemoDataMode}
                className="app-form-input h-11 w-full rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="space-y-2 text-sm text-foreground md:col-span-2">
              <span>메모</span>
              <textarea
                rows={4}
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
                disabled={!useDemoDataMode}
                className="app-form-input w-full rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground"
              onClick={() => setEditorOpen(false)}
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="button"
              className="app-cta-primary rounded-xl px-4 py-2 text-sm"
              onClick={() => void handleSaveEvent()}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" 일정은 캘린더에서 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteEvent()} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
