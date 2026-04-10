import { api } from "./http";

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
  total_elements: number;
  content: InboxListApiItem[];
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
  };
  ai_analysis: {
    domain: string | null;
    intent: string | null;
    summary: string | null;
    entities: Record<string, unknown> | null;
    confidence_score: number | null;
    schedule_detected: boolean | null;
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

export type InboxListSnapshot = InboxListApiResponse;
export type InboxDetailSnapshot = InboxDetailApiResponse;

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

  return response.data;
}

export async function getInboxDetail(emailId: number) {
  const response = await api.get<InboxDetailApiResponse>(`/api/inbox/${emailId}`);
  return response.data;
}

export async function sendInboxReply(emailId: number) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "SEND",
    content: null,
  });
  return response.data;
}

export async function editAndSendInboxReply(emailId: number, content: string) {
  const response = await api.post<InboxActionApiResponse>(`/api/inbox/${emailId}/reply`, {
    action: "EDIT_SEND",
    content,
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
