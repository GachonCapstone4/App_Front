import { api } from "./http";

type TemplateApiResponse = {
  template_id: number;
  user_template_no?: number | null;
  category_id: number;
  category_name: string;
  title: string;
  subject_template: string;
  body_template: string;
  accuracy_score: number | null;
  created_at: string;
};

type TemplateListApiResponse = {
  templates?: TemplateApiResponse[];
};

export type TemplateSnapshot = {
  templateId: number;
  userTemplateNo: number | null;
  categoryId: number;
  categoryName: string;
  title: string;
  subjectTemplate: string;
  bodyTemplate: string;
  accuracyScore: number | null;
  createdAt: string;
};

function mapTemplateSnapshot(template: TemplateApiResponse): TemplateSnapshot {
  return {
    templateId: template.template_id,
    userTemplateNo: template.user_template_no ?? null,
    categoryId: template.category_id,
    categoryName: template.category_name,
    title: template.title,
    subjectTemplate: template.subject_template,
    bodyTemplate: template.body_template,
    accuracyScore: template.accuracy_score,
    createdAt: template.created_at,
  };
}

export async function getTemplateLibrary() {
  const response = await api.get<TemplateListApiResponse>("/api/templates");
  return (response.data.templates ?? []).map(mapTemplateSnapshot);
}

export async function createTemplate(payload: {
  categoryId: number;
  title: string;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const response = await api.post<TemplateApiResponse>("/api/templates", {
    categoryId: payload.categoryId,
    title: payload.title,
    subjectTemplate: payload.subjectTemplate,
    bodyTemplate: payload.bodyTemplate,
  });

  return mapTemplateSnapshot(response.data);
}

export async function updateTemplate(
  templateId: number,
  payload: {
    title: string;
    subjectTemplate: string;
    bodyTemplate: string;
  }
) {
  const response = await api.put<TemplateApiResponse>(`/api/templates/${templateId}`, {
    title: payload.title,
    subjectTemplate: payload.subjectTemplate,
    bodyTemplate: payload.bodyTemplate,
  });

  return mapTemplateSnapshot(response.data);
}

export async function deleteTemplate(templateId: number) {
  await api.delete(`/api/templates/${templateId}`);
}
