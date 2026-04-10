import type { EmailItem, EmailStatus, EmailSchedule } from "../../shared/types";

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

export function mapBackendInboxStatus(status: string, draftStatus?: string | null): EmailStatus {
  if (draftStatus === "SKIPPED") {
    return "unsent";
  }

  if (status === "PROCESSED") {
    return "completed";
  }

  if (status === "AUTO_SENT") {
    return "auto-sent";
  }

  return "pending";
}

function mergeFrontendStatus(currentStatus: EmailStatus, draftStatus?: string | null): EmailStatus {
  if (currentStatus === "auto-sent") {
    return "auto-sent";
  }

  if (draftStatus === "SKIPPED") {
    return "unsent";
  }

  if (draftStatus === "SENT" || draftStatus === "EDITED") {
    return "completed";
  }

  if (currentStatus === "unsent") {
    return "unsent";
  }

  if (currentStatus === "completed") {
    return "completed";
  }

  return currentStatus;
}

export function mapFrontendInboxStatus(status: "all" | EmailStatus) {
  if (status === "pending") {
    return "PENDING_REVIEW";
  }

  if (status === "completed") {
    return "PROCESSED";
  }

  if (status === "unsent") {
    return undefined;
  }

  if (status === "auto-sent") {
    return "AUTO_SENT";
  }

  return undefined;
}

export function formatInboxTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatInboxReceivedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  })
    .format(date)
    .replace(/\s/g, "");
}

export function deriveCompanyFromEmail(senderEmail: string) {
  const domain = senderEmail.split("@")[1] ?? "";

  if (!domain) {
    return "";
  }

  const normalized = domain.replace(/\.[^.]+$/, "");
  return normalized
    .split(/[.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSchedule(entities: Record<string, unknown> | null, detected: boolean): EmailSchedule {
  if (!detected || !entities) {
    return { detected: false };
  }

  const title = typeof entities.title === "string" ? entities.title : null;
  const suggestedDate = typeof entities.date === "string" ? entities.date : null;
  const suggestedTime =
    typeof entities.time === "string"
      ? entities.time
      : typeof entities.start_time === "string"
        ? entities.start_time
        : null;
  const location = typeof entities.location === "string" ? entities.location : "";
  const attendees = Array.isArray(entities.participants)
    ? entities.participants
        .map((value) => (typeof value === "string" ? value : ""))
        .filter(Boolean)
    : [];

  if (!title || !suggestedDate || !suggestedTime) {
    return { detected: false };
  }

  return {
    detected: true,
    title,
    suggestedDate,
    suggestedTime,
    duration: typeof entities.duration === "string" ? entities.duration : "미정",
    type: location.toLowerCase().includes("zoom") || location.toLowerCase().includes("meet") ? "video" : "meeting",
    location: location || "미정",
    attendees,
  };
}

export function mapInboxListItem(item: InboxListApiItem): EmailItem {
  const senderEmail = item.sender_email ?? "";

  return {
    id: String(item.email_id),
    sender: item.sender_name ?? "발신자",
    senderEmail,
    company: deriveCompanyFromEmail(senderEmail),
    subject: item.subject,
    preview: "",
    summary: "",
    body: "",
    time: formatInboxTime(item.received_at),
    receivedDate: formatInboxReceivedDate(item.received_at),
    category: item.category_name ?? "미분류",
    confidence: 0,
    status: mapBackendInboxStatus(item.status, item.draft_status ?? null),
    sentTime: "",
    schedule: item.schedule_detected ? { detected: false } : { detected: false },
    draft: "",
    draftStatus: item.draft_status ?? undefined,
  };
}

export function mergeInboxDetail(current: EmailItem, detail: InboxDetailApiResponse): EmailItem {
  const aiAnalysis = detail.ai_analysis;
  const draftReply = detail.draft_reply;
  const emailInfo = detail.email_info;

  return {
    ...current,
    sender: emailInfo.sender_name ?? current.sender,
    senderEmail: emailInfo.sender_email ?? current.senderEmail,
    company: deriveCompanyFromEmail(emailInfo.sender_email ?? current.senderEmail),
    subject: emailInfo.subject,
    body: emailInfo.body,
    preview: aiAnalysis?.summary ?? current.preview,
    summary: aiAnalysis?.summary ?? "",
    category:
      current.category && current.category !== "미분류"
        ? current.category
        : aiAnalysis?.intent || "미분류",
    confidence: aiAnalysis?.confidence_score ? Number(aiAnalysis.confidence_score) : 0,
    schedule: buildSchedule(aiAnalysis?.entities ?? null, aiAnalysis?.schedule_detected === true),
    draft: draftReply?.body ?? "",
    status: mergeFrontendStatus(current.status, draftReply?.status ?? null),
    templateName: draftReply?.template_info?.template_title ?? undefined,
    draftSubject: draftReply?.subject ?? undefined,
    autoCompletedCount: draftReply?.variables?.auto_completed_count ?? undefined,
    requiredInputCount: draftReply?.variables?.required_input_count ?? undefined,
    draftStatus: draftReply?.status ?? undefined,
  };
}
