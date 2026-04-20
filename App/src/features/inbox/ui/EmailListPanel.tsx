import { EmptyState } from "../../../shared/ui/primitives/EmptyState";
import { StatusBadge } from "../../../shared/ui/primitives/StatusBadge";
import { emailStatusMeta } from "../../../entities/email/model/email-data";
import type { EmailItem, EmailStatus, StatusBadgeTone } from "../../../shared/types";

const metaByStatus = emailStatusMeta as Record<
  EmailStatus,
  { label: string; tone: StatusBadgeTone; banner: string }
>;

function getTone(status: EmailStatus): StatusBadgeTone {
  return metaByStatus[status]?.tone || "neutral";
}

interface EmailListPanelProps {
  emails: EmailItem[];
  selectedEmailId?: string;
  onSelect: (id: string) => void;
}

export function EmailListPanel({
  emails,
  selectedEmailId,
  onSelect,
}: EmailListPanelProps) {
  if (!emails.length) {
    return <EmptyState title="이메일이 없습니다" description="선택한 상태에 해당하는 이메일이 없습니다." />;
  }

  return (
    <div className="space-y-2">
      {emails.map((email: EmailItem) => {
        const selected = selectedEmailId === email.id;

        return (
          <button
            key={email.id}
            type="button"
            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
              selected
                ? "app-selected-surface"
                : "border-transparent bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#131D2F]"
            }`}
            onClick={() => onSelect(email.id)}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1E2A3A] text-xs font-semibold text-white dark:bg-[#18263A]">
                {email.sender.slice(0, 1)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[#1E2A3A] dark:text-foreground">
                    {email.sender}
                  </p>
                  <span className="shrink-0 text-[11px] text-[#94A3B8] dark:text-muted-foreground">
                    {email.time}
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-[#64748B] dark:text-muted-foreground">
                  {email.subject}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge label={metaByStatus[email.status].label} tone={getTone(email.status)} />
                  {email.schedule?.detected ? <StatusBadge label="일정 감지" tone="teal" /> : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
