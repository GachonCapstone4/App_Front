import { describe, expect, it } from "vitest";
import {
  getTemplateJobStatusLabel,
  getTemplateJobTitle,
  resolveProgressFromEvent,
  resolveProgressFromJobs,
  type TemplateJobProgressState,
} from "./business-profile.helpers";
import type { TemplateGenerationJobSnapshot } from "../../shared/api/onboarding";

const baseProgress: TemplateJobProgressState = {
  action: "regenerate",
  status: "PROCESSING",
  jobIds: ["job-1", "job-2"],
  targetCount: 2,
  completedCount: 0,
  failedCount: 0,
  message: "진행 중",
  updatedAt: 0,
};

function job(overrides: Partial<TemplateGenerationJobSnapshot>): TemplateGenerationJobSnapshot {
  return {
    jobId: "job-1",
    requestId: null,
    jobType: "draft.generate",
    status: "PROCESSING",
    progressStep: null,
    progressMessage: null,
    errorCode: null,
    errorMessage: null,
    targetId: null,
    completedAt: null,
    ...overrides,
  };
}

describe("business-profile helpers", () => {
  it("marks a tracked job set completed when every job is complete", () => {
    const next = resolveProgressFromJobs(
      baseProgress,
      [
        job({ jobId: "job-1", status: "COMPLETED" }),
        job({ jobId: "job-2", status: "COMPLETED", progressMessage: "완료됨" }),
      ],
      100,
    );

    expect(next.status).toBe("COMPLETED");
    expect(next.completedCount).toBe(2);
    expect(next.message).toBe("완료됨");
    expect(next.updatedAt).toBe(100);
  });

  it("prioritizes failure status and error messages from job polling", () => {
    const next = resolveProgressFromJobs(
      baseProgress,
      [
        job({ jobId: "job-1", status: "COMPLETED" }),
        job({ jobId: "job-2", status: "FAILED", errorMessage: "생성 실패" }),
      ],
      200,
    );

    expect(next.status).toBe("FAILED");
    expect(next.completedCount).toBe(1);
    expect(next.failedCount).toBe(1);
    expect(next.message).toBe("생성 실패");
  });

  it("ignores SSE events for unrelated jobs", () => {
    const next = resolveProgressFromEvent(
      baseProgress,
      {
        job_id: "other-job",
        status: "COMPLETED",
        progress_message: "다른 작업",
      },
      300,
    );

    expect(next).toBe(baseProgress);
  });

  it("updates progress from matching SSE completion events", () => {
    const next = resolveProgressFromEvent(
      { ...baseProgress, completedCount: 1 },
      {
        job_id: "job-2",
        status: "COMPLETED",
        progress_message: "생성 완료",
      },
      400,
    );

    expect(next.status).toBe("COMPLETED");
    expect(next.completedCount).toBe(2);
    expect(next.message).toBe("생성 완료");
  });

  it("returns user-facing labels for actions and statuses", () => {
    expect(getTemplateJobTitle("initial")).toBe("초기 템플릿 생성");
    expect(getTemplateJobTitle("regenerate")).toBe("템플릿 재생성");
    expect(getTemplateJobStatusLabel("REGISTERED")).toBe("등록됨");
    expect(getTemplateJobStatusLabel("PROCESSING")).toBe("진행 중");
    expect(getTemplateJobStatusLabel("COMPLETED")).toBe("완료");
    expect(getTemplateJobStatusLabel("FAILED")).toBe("실패");
  });
});
