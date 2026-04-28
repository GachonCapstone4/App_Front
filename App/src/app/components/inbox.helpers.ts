import type {
  EmailAttachment,
  EmailItem,
  EmailRecommendationItem,
  RecommendationState,
  EmailSchedule,
  EmailStatus,
} from "../../shared/types";

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
    schedule?: InboxScheduleApiItem | null;
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

type InboxRecommendationApiItem = {
  draft_id: number;
  template_title?: string | null;
  subject: string;
  body: string;
  similarity: number;
  email_id: number;
};

type InboxScheduleApiItem = {
  has_schedule: boolean;
  title: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  participants: string[] | null;
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

function normalizeScheduleTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [hour, minute] = value.split(":");

  if (!hour || !minute) {
    return value;
  }

  return `${hour.padStart(2, "0")}:${minute}`;
}

function buildDurationLabel(
  startTime: string | null,
  endTime: string | null,
  fallbackDuration?: unknown,
) {
  if (typeof fallbackDuration === "string" && fallbackDuration.trim()) {
    return fallbackDuration;
  }

  if (!startTime || !endTime) {
    return "미정";
  }

  return `${startTime} - ${endTime}`;
}

function getEntityString(entities: Record<string, unknown> | null, keys: string[]) {
  if (!entities) {
    return null;
  }

  for (const key of keys) {
    const value = entities[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getEntityStringList(entities: Record<string, unknown> | null, key: string) {
  const value = entities?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function buildSchedule(
  entities: Record<string, unknown> | null,
  detected: boolean,
  schedule?: InboxScheduleApiItem | null,
): EmailSchedule {
  const hasBackendSchedule = schedule?.has_schedule === true;

  if (!detected && !hasBackendSchedule) {
    return { detected: false };
  }

  const title =
    schedule?.title?.trim() ||
    getEntityString(entities, ["title", "event_title", "subject"]) ||
    "감지된 일정";
  const suggestedDate =
    schedule?.date ||
    getEntityString(entities, ["date", "event_date", "meeting_date"]);
  const suggestedTime =
    normalizeScheduleTime(schedule?.start_time) ||
    normalizeScheduleTime(getEntityString(entities, ["time", "start_time", "event_time", "meeting_time"]));
  const endTime = normalizeScheduleTime(schedule?.end_time);
  const location =
    schedule?.location?.trim() ||
    getEntityString(entities, ["location", "place", "meeting_location"]) ||
    "";
  const attendees =
    schedule?.participants?.filter(Boolean) ??
    getEntityStringList(entities, "participants");

  if (!suggestedDate || !suggestedTime) {
    return { detected: false };
  }

  return {
    detected: true,
    title,
    suggestedDate,
    suggestedTime,
    duration: buildDurationLabel(suggestedTime, endTime, entities?.duration),
    type: location.toLowerCase().includes("zoom") || location.toLowerCase().includes("meet") ? "video" : "meeting",
    location: location || "미정",
    attendees,
  };
}

export function mapInboxListItem(item: InboxListApiItem): EmailItem {
  const senderEmail = item.sender_email ?? "";
  const senderName = item.sender_name?.trim() || senderEmail || "발신자 정보 없음";
  const categoryName = item.category_name?.trim() || "분석 대기";

  return {
    id: String(item.email_id),
    sender: senderName,
    senderEmail,
    company: deriveCompanyFromEmail(senderEmail),
    subject: item.subject,
    preview: "",
    summary: "",
    body: "",
    time: formatInboxTime(item.received_at),
    receivedDate: formatInboxReceivedDate(item.received_at),
    category: categoryName,
    confidence: 0,
    status: mapBackendInboxStatus(item.status, item.draft_status ?? null),
    sentTime: "",
    schedule: item.schedule_detected ? { detected: false } : { detected: false },
    draft: "",
    draftStatus: item.draft_status ?? undefined,
    recommendations: [],
    recommendationState: "idle",
  };
}

export function mergeInboxDetail(current: EmailItem, detail: InboxDetailApiResponse): EmailItem {
  const aiAnalysis = detail.ai_analysis;
  const draftReply = detail.draft_reply;
  const emailInfo = detail.email_info;
  const aiDomain = aiAnalysis?.domain?.trim() || undefined;
  const aiIntent = aiAnalysis?.intent?.trim() || undefined;
  const attachments: EmailAttachment[] = Array.isArray(emailInfo.attachments)
    ? emailInfo.attachments.map((attachment) => ({
        attachmentId: attachment.attachment_id,
        fileName: attachment.file_name,
        contentType: attachment.content_type,
        size: attachment.size ?? undefined,
      }))
    : [];

  return {
    ...current,
    sender: emailInfo.sender_name ?? current.sender,
    senderEmail: emailInfo.sender_email ?? current.senderEmail,
    company: deriveCompanyFromEmail(emailInfo.sender_email ?? current.senderEmail),
    subject: emailInfo.subject,
    body: emailInfo.body,
    preview: aiAnalysis?.summary ?? current.preview,
    summary: aiAnalysis?.summary ?? "",
    matchingText:
      typeof aiAnalysis?.entities?.matching_text === "string"
        ? aiAnalysis.entities.matching_text
        : undefined,
    category: aiIntent || current.category || "분석 대기",
    businessDomain: aiDomain || current.businessDomain,
    confidence: aiAnalysis?.confidence_score ? Number(aiAnalysis.confidence_score) : 0,
    schedule: buildSchedule(
      aiAnalysis?.entities ?? null,
      aiAnalysis?.schedule_detected === true,
      aiAnalysis?.schedule ?? null,
    ),
    draft: draftReply?.body ?? "",
    status: mergeFrontendStatus(current.status, draftReply?.status ?? null),
    templateName: draftReply?.template_info?.template_title ?? undefined,
    draftSubject: draftReply?.subject ?? undefined,
    autoCompletedCount: draftReply?.variables?.auto_completed_count ?? undefined,
    requiredInputCount: draftReply?.variables?.required_input_count ?? undefined,
    draftStatus: draftReply?.status ?? undefined,
    attachments,
  };
}

export function mapInboxRecommendation(item: InboxRecommendationApiItem): EmailRecommendationItem | null {
  if (!item.template_title?.trim() || !item.subject?.trim() || !item.body?.trim()) {
    return null;
  }

  return {
    draftId: item.draft_id,
    templateTitle: item.template_title,
    subject: item.subject,
    body: item.body,
    similarity: Number(item.similarity),
    emailId: item.email_id,
  };
}

export function mergeInboxRecommendations(
  current: EmailItem,
  recommendations: EmailRecommendationItem[],
  recommendationState: RecommendationState,
  recommendationError?: string,
): EmailItem {
  const primary = recommendations[0];
  const shouldPrefillDraft = !current.draft.trim() && Boolean(primary);
  const shouldPrefillTemplateName = !current.templateName && Boolean(primary);
  const shouldPrefillDraftSubject = !current.draftSubject && Boolean(primary);

  return {
    ...current,
    recommendations,
    recommendationState,
    recommendationError,
    draft: shouldPrefillDraft && primary ? primary.body : current.draft,
    templateName: shouldPrefillTemplateName && primary ? primary.templateTitle : current.templateName,
    draftSubject: shouldPrefillDraftSubject && primary ? primary.subject : current.draftSubject,
  };
}
