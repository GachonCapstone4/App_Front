import { useState } from "react";
import { useNavigate } from "react-router";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { addInboxCalendarEvent, ignoreInboxCalendarEvent } from "../../../shared/api/inbox";
import { getErrorMessage } from "../../../shared/api/http";
import { AiUsageBadge } from "../../../shared/ui/primitives/AiUsageBadge";
import type { DetectedSchedule, EmailSchedule } from "../../../shared/types";

interface ScheduleDetectionCardProps {
  schedule: EmailSchedule;
  emailId: string;
  emailSubject: string;
}

export function ScheduleDetectionCard({
  schedule,
  emailId,
  emailSubject,
}: ScheduleDetectionCardProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [processingAction, setProcessingAction] = useState<"add" | "ignore" | null>(null);

  if (dismissed) {
    return null;
  }

  if (!schedule?.detected) {
    return null;
  }

  const detectedSchedule = schedule as DetectedSchedule;
  const prefillEvent = {
    title: detectedSchedule.title,
    date: detectedSchedule.suggestedDate,
    startTime: detectedSchedule.suggestedTime,
    endTime: detectedSchedule.suggestedTime,
    type: detectedSchedule.type === "video" ? "video" : "meeting",
    location: detectedSchedule.location,
    notes: `${emailSubject} 이메일에서 감지된 일정`,
    fromEmail: {
      id: emailId,
      sender: detectedSchedule.attendees[0] || "고객",
      subject: emailSubject,
    },
  };

  const handleAddToCalendar = async () => {
    try {
      setProcessingAction("add");
      const response = await addInboxCalendarEvent(Number(emailId));
      setDismissed(true);
      toast.success(response.message || "일정을 캘린더에 추가했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "일정을 캘린더에 추가하지 못했습니다."));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleIgnoreSchedule = async () => {
    try {
      setProcessingAction("ignore");
      const response = await ignoreInboxCalendarEvent(Number(emailId));
      setDismissed(true);
      toast.success(response.message || "이 이메일의 일정 감지를 무시했습니다.");
    } catch (error) {
      toast.error(getErrorMessage(error, "일정 감지 상태를 변경하지 못했습니다."));
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="app-violet-card rounded-2xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="app-violet-text flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" />
          AI가 일정 정보를 감지했습니다
        </p>
        <AiUsageBadge label="AI 일정 감지" />
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-[#1E2A3A] dark:text-foreground">
          {detectedSchedule.title}
        </h3>

        <div className="mt-4 space-y-2 text-sm text-[#64748B] dark:text-muted-foreground">
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {detectedSchedule.suggestedDate} {detectedSchedule.suggestedTime} ({detectedSchedule.duration})
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {detectedSchedule.location}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#7C3AED] dark:bg-[#46306B] dark:text-[#F5F3FF] dark:hover:bg-[#523A7C]"
          onClick={() => void handleAddToCalendar()}
          disabled={processingAction !== null}
        >
          {processingAction === "add" ? "추가 중..." : "캘린더에 추가"}
        </button>
        <button
          type="button"
          className="app-secondary-button app-violet-text rounded-xl border px-4 py-2 text-xs font-medium hover:bg-[#F5F3FF]"
          onClick={() => {
            navigate("/app/calendar", {
              state: {
                prefillEvent,
                autoSubmit: false,
              },
            });
          }}
          disabled={processingAction !== null}
        >
          내용 수정 후 추가
        </button>
        <button
          type="button"
          className="rounded-xl px-1 py-2 text-xs font-medium text-[#94A3B8] transition hover:text-[#64748B] dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => void handleIgnoreSchedule()}
          disabled={processingAction !== null}
        >
          {processingAction === "ignore" ? "무시 처리 중..." : "이 이메일에서 무시"}
        </button>
      </div>
    </div>
  );
}
