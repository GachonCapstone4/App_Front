import { api } from "./http";

type InboxAttachmentApiItem = {
  attachment_id: number;
  file_name: string;
  content_type: string;
  size?: number | null;
};

type InboxListApiItem = {
  email_id: number;
  sender_name: string | null;
  sender_email?: string | null;
  subject: string;
  received_at: string;
  status: string;
  draft_status?: string | null;
  category_name: string | null;
  schedule_detected: boolean;
  has_attachments: boolean;
};

type InboxListApiResponse = {
  total_elements?: number;
  content?: InboxListApiItem[] | null;
};

type InboxDetailApiResponse = {
  email_info: {
    email_id: number;
    sender_name: string | null;
    sender_email?: string | null;
    subject: string;
    body: string;
    received_at: string;
    has_attachments: boolean;
    attachments?: InboxAttachmentApiItem[] | null;
  };
  ai_analysis: {
    domain: string | null;
    intent: string | null;
    summary: string | null;
    entities: Record<string, unknown> | null;
    confidence_score: number | null;
    schedule_detected: boolean | null;
    schedule?: {
      has_schedule: boolean;
      title: string | null;
      date: string | null;
      start_time: string | null;
      end_time: string | null;
      location: string | null;
      participants: string[] | null;
    } | null;
  } | null;
  draft_reply: {
    draft_id: number;
    status: string | null;
    template_info: {
      template_id: number;
      template_title: string;
    } | null;
    variables: {
      auto_completed_count: number;
      auto_completed_keys: string[];
      required_input_count: number;
      required_input_keys: string[];
    } | null;
    subject: string | null;
    body: string | null;
  } | null;
};

type InboxActionApiResponse = {
  message: string;
};

type InboxRecommendationApiItem = {
  draft_id: number;
  template_id?: number | null;
  template_title?: string | null;
  subject: string;
  body: string;
  similarity: number;
  email_id: number;
  auto_completed_count?: number | null;
  auto_completed_keys?: string[] | null;
  auto_completed_values?: Record<string, string> | null;
  required_input_count?: number | null;
  required_input_keys?: string[] | null;
};

type InboxRecommendationsApiResponse = {
  drafts?: InboxRecommendationApiItem[] | null;
};

export type InboxListSnapshot = InboxListApiResponse;
export type InboxDetailSnapshot = InboxDetailApiResponse;
export type InboxRecommendationSnapshot = InboxRecommendationApiItem;

export async function getInboxList(payload?: {
  page?: number;
  size?: number;
  status?: string;
}) {
  const response = await api.get<InboxListApiResponse>("/api/inbox", {
    params: {
      page: payload?.page ?? 0,
      size: payload?.size ?? 200,
      status: payload?.status,
    },
  });

  return {
    total_elements: response.data?.total_elements ?? 0,
    content: Array.isArray(response.data?.content) ? response.data.content : [],
  };
}

export async function getInboxDetail(emailId: number) {
  const response = await api.get<InboxDetailApiResponse>(`/api/inbox/${emailId}`);
  return response.data;
}

function parseDownloadFileName(contentDisposition: string | undefined, fallbackFileName: string) {
  if (!contentDisposition) {
    return fallbackFileName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallbackFileName;
    }
  }

  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  return fallbackFileName;
}

export async function downloadInboxAttachment(
  emailId: number,
  attachmentId: number,
  fallbackFileName: string,
) {
  const response = await api.get<Blob>(`/api/inbox/${emailId}/attachments/${attachmentId}`, {
    responseType: "blob",
  });

  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
  const fileName = parseDownloadFileName(
    response.headers["content-disposition"],
    fallbackFileName,
  );
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}

export async function getInboxRecommendations(emailId: number, topK = 3) {
  const response = await api.get<InboxRecommendationsApiResponse>(`/api/inbox/${emailId}/recommendations`, {
    params: {
      topK,
    },
    timeout: 10000,
  });

  return Array.isArray(response.data?.drafts) ? response.data.drafts : [];
}

export async function sendInboxReply(emailId: number) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "SEND",
    content: null,
  });
  return response.data;
}

export async function editAndSendInboxReply(emailId: number, content: string, subject?: string) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "EDIT_SEND",
    subject: subject?.trim() || null,
    content,
  });
  return response.data;
}

export async function saveInboxReplyDraft(
  emailId: number,
  content: string,
  subject?: string,
  recommendationId?: number,
  manualDraft = false,
) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "SAVE_DRAFT",
    subject: subject?.trim() || null,
    content,
    recommendation_id: recommendationId ?? null,
    manual_draft: manualDraft,
  });
  return response.data;
}

export async function skipInboxReply(emailId: number) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "SKIP",
    content: null,
  });
  return response.data;
}

export async function addInboxCalendarEvent(emailId: number) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/calendar`, {
    action: "ADD",
  });
  return response.data;
}

export async function ignoreInboxCalendarEvent(emailId: number) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/calendar`, {
    action: "IGNORE",
  });
  return response.data;
}
