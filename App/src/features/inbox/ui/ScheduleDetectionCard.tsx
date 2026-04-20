import { useState } from "react";
import { useNavigate } from "react-router";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

  return (
    <div className="app-violet-card rounded-2xl border p-5">
      <p className="app-violet-text flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4" />
        AI가 일정 정보를 감지했습니다
      </p>

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
          onClick={() => {
            navigate("/app/calendar", {
              state: {
                prefillEvent,
                autoSubmit: true,
              },
            });
          }}
        >
          캘린더에 추가
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
        >
          내용 수정 후 추가
        </button>
        <button
          type="button"
          className="rounded-xl px-1 py-2 text-xs font-medium text-[#94A3B8] transition hover:text-[#64748B] dark:text-muted-foreground dark:hover:text-foreground"
          onClick={() => {
            setDismissed(true);
            toast("이 이메일의 일정 감지를 무시했습니다.");
          }}
        >
          이 이메일에서 무시
        </button>
      </div>
    </div>
  );
}
