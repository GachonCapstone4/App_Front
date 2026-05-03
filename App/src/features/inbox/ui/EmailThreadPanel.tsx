import { useState } from "react";
import { Download, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { downloadInboxAttachment } from "../../../shared/api/inbox";
import { getErrorMessage } from "../../../shared/api/http";
import { StatusBadge } from "../../../shared/ui/primitives/StatusBadge";
import { AiUsageBadge } from "../../../shared/ui/primitives/AiUsageBadge";
import { emailStatusMeta } from "../../../entities/email/model/email-data";
import { ScheduleDetectionCard } from "./ScheduleDetectionCard";
import type { EmailItem, EmailStatus, StatusBadgeTone } from "../../../shared/types";

const metaByStatus = emailStatusMeta as Record<
  EmailStatus,
  { label: string; tone: StatusBadgeTone; banner: string }
>;

function getAnalysisBadgeLabel(prefix: string, value?: string) {
  const normalized = value?.trim();

  if (!normalized || normalized === "분석 대기" || normalized === "미분류") {
    return null;
  }

  return `${prefix}: ${normalized}`;
}

interface EmailThreadPanelProps {
  email: EmailItem | null;
}

export function EmailThreadPanel({ email }: EmailThreadPanelProps) {
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);

  if (!email) {
    return null;
  }

  const formatAttachmentSize = (size?: number) => {
    if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
      return null;
    }

    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }

    if (size >= 1024) {
      return `${Math.round(size / 1024)}KB`;
    }

    return `${size}B`;
  };

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    try {
      setDownloadingAttachmentId(attachmentId);
      await downloadInboxAttachment(Number(email.id), attachmentId, fileName);
    } catch (error) {
      toast.error(getErrorMessage(error, "첨부파일을 다운로드하지 못했습니다."));
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const domainBadgeLabel = getAnalysisBadgeLabel("업종", email.businessDomain);
  const categoryBadgeLabel = getAnalysisBadgeLabel("카테고리", email.category);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={metaByStatus[email.status].label} tone={metaByStatus[email.status].tone} />
        {(domainBadgeLabel || categoryBadgeLabel) ? <AiUsageBadge label="AI 분류 결과" /> : null}
        {domainBadgeLabel ? <StatusBadge label={domainBadgeLabel} tone="neutral" /> : null}
        {categoryBadgeLabel ? <StatusBadge label={categoryBadgeLabel} tone="teal" /> : null}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[28px] font-semibold leading-tight text-[#1E2A3A] dark:text-foreground">{email.subject}</h2>

          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2A3A] text-xs font-semibold text-white dark:bg-[#0F766E]">
              {email.sender.slice(0, 1)}
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#1E2A3A] dark:text-foreground">
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

      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FBFDFF] p-5 dark:border-border dark:bg-card/70">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4 dark:border-border dark:bg-muted/20">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
              메일 요약
            </p>
            <AiUsageBadge label="AI 요약" />
          </div>
          {email.summary.trim() ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#334155] dark:text-slate-200">
              {email.summary}
            </p>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-[#BFD8D4] bg-[#F8FFFD] px-4 py-3 text-left dark:border-[#1F4E48] dark:bg-[#082F2D]/25">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDFBF4] text-[#0F766E] dark:bg-[#134E4A] dark:text-[#5EEAD4]">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1E2A3A] dark:text-slate-100">
                  메일 요약을 생성하는 중입니다
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#64748B] dark:text-slate-400">
                  AI 서버 분석이 완료되면 실제 요약 결과가 표시됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="my-4 h-px bg-[#E2E8F0] dark:bg-border" />
        <pre className="whitespace-pre-wrap font-sans text-[14px] leading-8 text-[#475569] dark:text-slate-300">{email.body}</pre>

        {email.attachments?.length ? (
          <>
            <div className="my-4 h-px bg-[#E2E8F0]" />

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0F766E]">
                첨부파일
              </p>

              <div className="space-y-2">
                {email.attachments.map((attachment) => {
                  const sizeLabel = formatAttachmentSize(attachment.size);
                  const downloading = downloadingAttachmentId === attachment.attachmentId;

                  return (
                    <button
                      key={attachment.attachmentId}
                      type="button"
                      onClick={() =>
                        void handleDownloadAttachment(
                          attachment.attachmentId,
                          attachment.fileName,
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#D7E2EC] bg-white px-4 py-3 text-left transition hover:border-[#9EDFD2] hover:bg-[#F8FFFD]"
                      disabled={downloading}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6FFFA] text-[#0F766E]">
                          <Paperclip className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#1E2A3A]">
                            {attachment.fileName}
                          </p>
                          <p className="truncate text-xs text-[#94A3B8]">
                            {attachment.contentType}
                            {sizeLabel ? ` · ${sizeLabel}` : ""}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#0F766E]">
                        <Download className="h-3.5 w-3.5" />
                        {downloading ? "다운로드 중..." : "다운로드"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <ScheduleDetectionCard schedule={email.schedule} emailId={email.id} emailSubject={email.subject} />
    </div>
  );
}
