import type { TemplateGenerationJobSnapshot } from "../../shared/api/onboarding";
import type { RagJobUpdatedEventPayload } from "../../shared/lib/app-event-stream";

export type TemplateJobAction = "initial" | "regenerate";
export type TemplateJobStatus = "REGISTERED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface TemplateJobProgressState {
  action: TemplateJobAction;
  status: TemplateJobStatus;
  jobIds: string[];
  targetCount: number;
  completedCount: number;
  failedCount: number;
  message: string;
  updatedAt: number;
}

export function resolveProgressFromJobs(
  current: TemplateJobProgressState,
  jobs: TemplateGenerationJobSnapshot[],
  now = Date.now(),
) {
  const completedCount = jobs.filter((job) => job.status === "COMPLETED").length;
  const failedJobs = jobs.filter((job) => job.status === "FAILED");
  const lastMessage = [...jobs]
    .reverse()
    .find((job) => job.progressMessage || job.errorMessage);
  const status: TemplateJobStatus =
    failedJobs.length > 0
      ? "FAILED"
      : completedCount >= current.jobIds.length && current.jobIds.length > 0
        ? "COMPLETED"
        : "PROCESSING";

  return {
    ...current,
    status,
    completedCount,
    failedCount: failedJobs.length,
    message:
      failedJobs[0]?.errorMessage ??
      lastMessage?.progressMessage ??
      (status === "COMPLETED"
        ? "템플릿 작업이 완료되었습니다."
        : current.message),
    updatedAt: now,
  } satisfies TemplateJobProgressState;
}

export function resolveProgressFromEvent(
  current: TemplateJobProgressState,
  payload: RagJobUpdatedEventPayload,
  now = Date.now(),
) {
  const jobId = payload.job_id?.trim();
  if (!jobId || !current.jobIds.includes(jobId)) {
    return current;
  }

  const nextFailedCount =
    payload.status === "FAILED"
      ? Math.max(current.failedCount, 1)
      : current.failedCount;
  const nextCompletedCount =
    payload.status === "COMPLETED"
      ? Math.min(current.targetCount, current.completedCount + 1)
      : current.completedCount;
  const status: TemplateJobStatus =
    nextFailedCount > 0
      ? "FAILED"
      : nextCompletedCount >= current.targetCount
        ? "COMPLETED"
        : "PROCESSING";

  return {
    ...current,
    status,
    completedCount: nextCompletedCount,
    failedCount: nextFailedCount,
    message:
      payload.error_message?.trim() ||
      payload.progress_message?.trim() ||
      (status === "COMPLETED" ? "템플릿 작업이 완료되었습니다." : current.message),
    updatedAt: now,
  } satisfies TemplateJobProgressState;
}

export function getTemplateJobTitle(action: TemplateJobAction) {
  return action === "initial" ? "초기 템플릿 생성" : "템플릿 재생성";
}

export function getTemplateJobStatusLabel(status: TemplateJobStatus) {
  if (status === "COMPLETED") {
    return "완료";
  }
  if (status === "FAILED") {
    return "실패";
  }
  if (status === "REGISTERED") {
    return "등록됨";
  }
  return "진행 중";
}
