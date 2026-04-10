import { ApiError, api } from "./http";

type OnboardingStatusApiResponse = {
  onboarding_completed: boolean;
};

type InitialTemplateGenerateApiResponse = {
  status: string;
  processing_count: number;
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
  };
}
