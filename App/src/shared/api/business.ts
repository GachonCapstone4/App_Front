import { api } from "./http";

type BusinessProfileApiResponse = {
  industry_type: string;
  company_description: string;
  email_tone: string | null;
};

type BusinessResourceApiResponse = {
  resource_id: number;
  file_name: string;
  file_type: string | null;
  created_at: string;
};

type BusinessResourceListApiResponse = {
  resources: BusinessResourceApiResponse[];
};

type PresignedUrlApiResponse = {
  presigned_url: string;
  s3_key: string;
};

type FaqApiResponse = {
  faq_id: number;
  question: string;
  answer: string;
  created_at: string;
};

type FaqListApiResponse = {
  faqs: FaqApiResponse[];
};

type TemplateApiResponse = {
  template_id: number;
  title: string;
};

type TemplateListApiResponse = {
  templates: TemplateApiResponse[];
};

type CategoryApiResponse = {
  category_id: number;
  category_name: string;
  color: string | null;
};

type CategoryListApiResponse = {
  categories: CategoryApiResponse[];
};

type TemplateRegenerateApiResponse = {
  status: string;
  processing_count: number;
};

export type BusinessProfileSnapshot = {
  industryType: string;
  companyDescription: string;
  emailTone: string | null;
};

export type BusinessResourceSnapshot = {
  resourceId: number;
  fileName: string;
  fileType: string | null;
  createdAt: string;
};

export type FaqSnapshot = {
  faqId: number;
  question: string;
  answer: string;
  createdAt: string;
};

export type TemplateSummarySnapshot = {
  templateId: number;
  title: string;
};

export type BusinessCategorySnapshot = {
  categoryId: number;
  categoryName: string;
  color: string | null;
};

export async function getBusinessProfile() {
  const response = await api.get<BusinessProfileApiResponse | undefined>("/api/business/profile");

  if (response.status === 204 || !response.data) {
    return null;
  }

  return {
    industryType: response.data.industry_type,
    companyDescription: response.data.company_description,
    emailTone: response.data.email_tone,
  } satisfies BusinessProfileSnapshot;
}

export async function upsertBusinessProfile(payload: {
  industryType: string;
  companyDescription: string;
  emailTone: "FORMAL" | "NEUTRAL" | "FRIENDLY";
}) {
  await api.put("/api/business/profile", {
    industry_type: payload.industryType,
    company_description: payload.companyDescription,
    email_tone: payload.emailTone,
  });
}

export async function getBusinessResources() {
  const response = await api.get<BusinessResourceListApiResponse>("/api/business/resources/files");

  return response.data.resources.map((resource) => ({
    resourceId: resource.resource_id,
    fileName: resource.file_name,
    fileType: resource.file_type,
    createdAt: resource.created_at,
  })) satisfies BusinessResourceSnapshot[];
}

export async function uploadBusinessFile(file: File) {
  const contentType = file.type || "application/octet-stream";
  const presignedResponse = await api.post<PresignedUrlApiResponse>("/api/business/resources/presigned-url", {
    file_name: file.name,
    content_type: contentType,
  });

  const uploadResponse = await fetch(presignedResponse.data.presigned_url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 업로드에 실패했습니다. status=${uploadResponse.status}`);
  }

  const response = await api.post<BusinessResourceApiResponse>("/api/business/resources/files", {
    s3_key: presignedResponse.data.s3_key,
    file_name: file.name,
  });

  return {
    resourceId: response.data.resource_id,
    fileName: response.data.file_name,
    fileType: response.data.file_type,
    createdAt: response.data.created_at,
  } satisfies BusinessResourceSnapshot;
}

export async function deleteBusinessFile(resourceId: number) {
  await api.delete(`/api/business/resources/files/${resourceId}`);
}

export async function getBusinessFaqs() {
  const response = await api.get<FaqListApiResponse>("/api/business/resources/faqs");

  return response.data.faqs.map((faq) => ({
    faqId: faq.faq_id,
    question: faq.question,
    answer: faq.answer,
    createdAt: faq.created_at,
  })) satisfies FaqSnapshot[];
}

export async function createBusinessFaq(payload: {
  question: string;
  answer: string;
}) {
  const response = await api.post<FaqApiResponse>("/api/business/resources/faqs", payload);

  return {
    faqId: response.data.faq_id,
    question: response.data.question,
    answer: response.data.answer,
    createdAt: response.data.created_at,
  } satisfies FaqSnapshot;
}

export async function updateBusinessFaq(
  faqId: number,
  payload: {
    question: string;
    answer: string;
  }
) {
  const response = await api.put<FaqApiResponse>(`/api/business/resources/faqs/${faqId}`, payload);

  return {
    faqId: response.data.faq_id,
    question: response.data.question,
    answer: response.data.answer,
    createdAt: response.data.created_at,
  } satisfies FaqSnapshot;
}

export async function deleteBusinessFaq(faqId: number) {
  await api.delete(`/api/business/resources/faqs/${faqId}`);
}

export async function getTemplates() {
  const response = await api.get<TemplateListApiResponse>("/api/templates");

  return response.data.templates.map((template) => ({
    templateId: template.template_id,
    title: template.title,
  })) satisfies TemplateSummarySnapshot[];
}

export async function getBusinessCategories() {
  const response = await api.get<CategoryListApiResponse>("/api/business/categories");

  return response.data.categories.map((category) => ({
    categoryId: category.category_id,
    categoryName: category.category_name,
    color: category.color,
  })) satisfies BusinessCategorySnapshot[];
}

export async function createBusinessCategory(payload: {
  categoryName: string;
  color?: string | null;
}) {
  const response = await api.post<CategoryApiResponse>("/api/business/categories", {
    category_name: payload.categoryName,
    color: payload.color ?? null,
  });

  return {
    categoryId: response.data.category_id,
    categoryName: response.data.category_name,
    color: response.data.color,
  } satisfies BusinessCategorySnapshot;
}

export async function deleteBusinessCategory(categoryId: number) {
  await api.delete(`/api/business/categories/${categoryId}`);
}

export async function regenerateBusinessTemplates(payload: {
  regenerateAll: boolean;
  templateIds: number[];
}) {
  const response = await api.post<TemplateRegenerateApiResponse>("/api/business/templates/regenerate", {
    regenerate_all: payload.regenerateAll,
    template_ids: payload.templateIds,
  });

  return {
    status: response.data.status,
    processingCount: response.data.processing_count,
  };
}
