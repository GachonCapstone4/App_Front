import { StatusBadge } from "../../../shared/ui/primitives/StatusBadge";
import { emailStatusMeta } from "../../../entities/email/model/email-data";
import { ScheduleDetectionCard } from "./ScheduleDetectionCard";
import type { EmailItem, EmailStatus, StatusBadgeTone } from "../../../shared/types";
import { StatePanel } from "../../../shared/ui/primitives/StatePanel";

const metaByStatus = emailStatusMeta as Record<
  EmailStatus,
  { label: string; tone: StatusBadgeTone; banner: string }
>;

function getConfidenceTone(confidence: number): StatusBadgeTone {
  if (confidence >= 95) {
    return "success";
  }

  if (confidence >= 90) {
    return "teal";
  }

  return "warning";
}

interface EmailThreadPanelProps {
  email: EmailItem | null;
}

export function EmailThreadPanel({ email }: EmailThreadPanelProps) {
  if (!email) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={`신뢰도 ${email.confidence}%`} tone={getConfidenceTone(email.confidence)} />
        <StatusBadge label={email.category} tone="teal" />
        <StatusBadge label={metaByStatus[email.status].label} tone={metaByStatus[email.status].tone} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[28px] font-semibold leading-tight text-[#1E2A3A]">{email.subject}</h2>

          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2A3A] text-xs font-semibold text-white">
              {email.sender.slice(0, 1)}
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#1E2A3A]">
                {email.sender}
                {email.company ? (
                  <span className="ml-2 text-[#94A3B8]">{email.company}</span>
                ) : null}
              </p>
              {email.senderEmail ? (
                <p className="truncate text-xs text-[#94A3B8]">{email.senderEmail}</p>
              ) : null}
            </div>
          </div>
        </div>

        <span className="text-xs text-[#94A3B8]">{email.receivedDate} · {email.time}</span>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FBFDFF] p-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
            메일 요약
          </p>
          {email.summary.trim() ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#334155]">
              {email.summary}
            </p>
          ) : (
            <StatePanel
              title="메일 요약을 생성하는 중입니다"
              description="AI 서버 분석이 완료되면 실제 요약 결과가 이 영역에 표시됩니다."
              tone="neutral"
              className="mt-3 min-h-[160px]"
            />
          )}
        </div>

        <div className="my-4 h-px bg-[#E2E8F0]" />
        <pre className="whitespace-pre-wrap font-sans text-[14px] leading-8 text-[#475569]">{email.body}</pre>
      </div>

      <ScheduleDetectionCard schedule={email.schedule} emailId={email.id} emailSubject={email.subject} />
    </div>
  );
}
