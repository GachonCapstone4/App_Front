import { ApiError, api } from "./http";

type OnboardingStatusApiResponse = {
  onboarding_completed: boolean;
};

type InitialTemplateGenerateApiResponse = {
  status: string;
  processing_count: number;
  job_ids: string[];
  knowledge_job_id?: string | null;
};

type TemplateGenerationJobApiItem = {
  job_id: string;
  request_id?: string | null;
  job_type?: string | null;
  status: string;
  progress_step?: string | null;
  progress_message?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  target_id?: string | null;
  completed_at?: string | null;
};

export type TemplateGenerationJobSnapshot = {
  jobId: string;
  requestId: string | null;
  jobType: string | null;
  status: string;
  progressStep: string | null;
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  targetId: string | null;
  completedAt: string | null;
};

type TemplateGenerationJobsApiResponse = {
  all_completed: boolean;
  has_failure: boolean;
  completed_count: number;
  processing_count: number;
  failed_count: number;
  jobs: TemplateGenerationJobApiItem[];
};

export async function getOnboardingStatus() {
  const response = await api.get<OnboardingStatusApiResponse>("/api/onboarding/status");
  return response.data.onboarding_completed;
}

export async function getOnboardingStatusSafe() {
  try {
    return await getOnboardingStatus();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function completeOnboarding() {
  await api.post("/api/onboarding/complete");
}

export async function generateInitialBusinessTemplates(payload: {
  industryType: string;
  emailTone: "FORMAL" | "NEUTRAL" | "FRIENDLY";
  companyDescription: string;
  categoryIds: number[];
  faqIds: number[];
  resourceIds: number[];
}) {
  const response = await api.post<InitialTemplateGenerateApiResponse>(
    "/api/business/templates/generate-initial",
    {
      industry_type: payload.industryType,
      email_tone: payload.emailTone,
      company_description: payload.companyDescription,
      category_ids: payload.categoryIds,
      faq_ids: payload.faqIds,
      resource_ids: payload.resourceIds,
    },
  );

  return {
    status: response.data.status,
    processingCount: response.data.processing_count,
    jobIds: response.data.job_ids ?? [],
    knowledgeJobId: response.data.knowledge_job_id ?? null,
  };
}

export async function getTemplateGenerationJobs(jobIds: string[]) {
  const response = await api.get<TemplateGenerationJobsApiResponse>(
    "/api/onboarding/template-jobs",
    {
      params: {
        job_ids: jobIds.join(","),
      },
    },
  );

  return {
    allCompleted: response.data.all_completed,
    hasFailure: response.data.has_failure,
    completedCount: response.data.completed_count,
    processingCount: response.data.processing_count,
    failedCount: response.data.failed_count,
    jobs: response.data.jobs.map((job) => ({
      jobId: job.job_id,
      requestId: job.request_id ?? null,
      jobType: job.job_type ?? null,
      status: job.status,
      progressStep: job.progress_step ?? null,
      progressMessage: job.progress_message ?? null,
      errorCode: job.error_code ?? null,
      errorMessage: job.error_message ?? null,
      targetId: job.target_id ?? null,
      completedAt: job.completed_at ?? null,
    })),
  };
}
