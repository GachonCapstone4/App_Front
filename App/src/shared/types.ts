export type EmailStatus = "pending" | "completed" | "unsent" | "auto-sent";

export type StatusBadgeTone =
  | "warning"
  | "success"
  | "neutral"
  | "teal"
  | "red";

export type SearchSectionKey = "inbox" | "calendar" | "templates";

export type SettingsTabId =
  | "account"
  | "notifications"
  | "display"
  | "email"
  | "support";

export interface SearchIndexItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  path: string;
}

export interface DetectedSchedule {
  detected: true;
  title: string;
  suggestedDate: string;
  suggestedTime: string;
  duration: string;
  type: "video" | "meeting";
  location: string;
  attendees: string[];
}

export interface UndetectedSchedule {
  detected: false;
}

export type EmailSchedule = DetectedSchedule | UndetectedSchedule;

export interface EmailAttachment {
  attachmentId: number;
  fileName: string;
  contentType: string;
  size?: number;
}

export interface EmailRecommendationItem {
  draftId: number;
  templateId?: number;
  templateTitle: string;
  subject: string;
  body: string;
  similarity: number;
  emailId: number;
  autoCompletedCount?: number;
  autoCompletedKeys?: string[];
  autoCompletedValues?: Record<string, string>;
  requiredInputCount?: number;
  requiredInputKeys?: string[];
}

export type RecommendationState = "idle" | "loading" | "ready" | "empty" | "error";

export interface DraftEditSnapshot {
  draft: string;
  draftSubject?: string;
  templateName?: string;
  selectedTemplateId?: number;
  autoCompletedCount?: number;
  autoCompletedValues?: Record<string, string>;
  requiredInputCount?: number;
  selectedRecommendationId?: number;
  isManualDraft?: boolean;
}

export interface EmailItem {
  id: string;
  sender: string;
  senderEmail: string;
  company: string;
  subject: string;
  preview: string;
  summary: string;
  matchingText?: string;
  body: string;
  time: string;
  receivedDate: string;
  category: string;
  businessDomain?: string;
  confidence: number;
  status: EmailStatus;
  sentTime: string;
  schedule: EmailSchedule;
  draft: string;
  templateName?: string;
  draftSubject?: string;
  autoCompletedCount?: number;
  autoCompletedValues?: Record<string, string>;
  requiredInputCount?: number;
  draftStatus?: string;
  attachments?: EmailAttachment[];
  recommendations?: EmailRecommendationItem[];
  recommendationState?: RecommendationState;
  recommendationError?: string;
  selectedRecommendationId?: number;
  selectedTemplateId?: number;
  isDraftEditing?: boolean;
  isManualDraft?: boolean;
  draftEditSnapshot?: DraftEditSnapshot;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  time: string;
  actionLabel: string;
  actionPath: string;
  read: boolean;
  tone: "teal" | "amber" | "red";
}

export interface AccountSettings {
  name: string;
  email: string;
}

export interface NotificationSettings {
  newEmail: boolean;
  draftQueue: boolean;
  draftThreshold: number;
  accountError: boolean;
  unclassified: boolean;
  calendarQueue: boolean;
  dailySummary: boolean;
}

export interface DisplayWidget {
  id: string;
  label: string;
  visible: boolean;
}

export interface DisplaySettings {
  theme: "light" | "dark";
  widgets: DisplayWidget[];
}

export interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  status: string;
}
