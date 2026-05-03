import { getAccessToken } from "./app-session";

export type ClassifyCompleteEventPayload = {
  email_id?: number | string | null;
};

export type RagJobUpdatedEventPayload = {
  job_id?: string;
  request_id?: string;
  job_type?: string;
  target_type?: string | null;
  target_id?: string | number | null;
  status?: string;
  progress_step?: string | null;
  progress_message?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  completed_at?: string | null;
};

export type SupportTicketUpdatedEventPayload = {
  ticket_id?: number | string | null;
  status?: string | null;
  admin_reply_present?: boolean;
  updated_at?: string | null;
};

export type TemplateMatchUpdatedEventPayload = {
  email_id?: number | string | null;
  recommendation_count?: number | null;
};

export type NotificationUpdatedEventPayload = {
  notification_id?: number | string | null;
  type?: string | null;
  title?: string | null;
  related_id?: number | string | null;
};

export type DiagnosticEventPayload = {
  user_id?: number | string | null;
  sse_type?: "network_test" | "os" | "vpn" | string;
  data?: string | {
    message?: string;
    raw_output?: string;
    module?: string;
    node_ip?: string;
    stage?: string;
    status?: string;
    timestamp?: string;
  };
  module?: string;
  node_ip?: string;
  stage?: string;
  status?: string;
  message?: string;
  raw_output?: string;
  timestamp?: string;
};

type AppEventPayloadMap = {
  "classify-complete": ClassifyCompleteEventPayload;
  "rag-job-updated": RagJobUpdatedEventPayload;
  "support-ticket-updated": SupportTicketUpdatedEventPayload;
  "template-match-updated": TemplateMatchUpdatedEventPayload;
  "notification-updated": NotificationUpdatedEventPayload;
  network_test: DiagnosticEventPayload;
  os: DiagnosticEventPayload;
  vpn: DiagnosticEventPayload;
};

type AppEventName = keyof AppEventPayloadMap;
type AppEventListener<K extends AppEventName> = (payload: AppEventPayloadMap[K]) => void;

const listeners: {
  [K in AppEventName]: Set<AppEventListener<K>>;
} = {
  "classify-complete": new Set(),
  "rag-job-updated": new Set(),
  "support-ticket-updated": new Set(),
  "template-match-updated": new Set(),
  "notification-updated": new Set(),
  network_test: new Set(),
  os: new Set(),
  vpn: new Set(),
};

let eventSource: EventSource | null = null;

function hasActiveListeners() {
  return Object.values(listeners).some((listenerSet) => listenerSet.size > 0);
}

function closeEventSource() {
  eventSource?.close();
  eventSource = null;
}

function getSseBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_SSE_BASE_URL?.trim();

  if (envBaseUrl && envBaseUrl.length > 0) {
    return envBaseUrl.replace(/\/$/, "");
  }

  return "";
}

export function buildAppEventStreamUrl() {
  const accessToken = getAccessToken().trim();

  if (!accessToken) {
    return null;
  }

  return `${getSseBaseUrl()}/sse/connect?access_token=${encodeURIComponent(accessToken)}`;
}

function parseEventPayload<T>(event: Event): T | null {
  const messageEvent = event as MessageEvent<string>;

  if (typeof messageEvent.data !== "string" || messageEvent.data.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(messageEvent.data) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      "sse_type" in parsed &&
      "data" in parsed
    ) {
      const envelope = parsed as { data?: unknown };

      if (typeof envelope.data === "string") {
        const trimmedData = envelope.data.trim();

        if (!trimmedData) {
          return null;
        }

        try {
          return JSON.parse(trimmedData) as T;
        } catch {
          return { data: envelope.data } as T;
        }
      }

      return envelope.data as T;
    }

    return parsed as T;
  } catch (error) {
    console.error("SSE payload parse error", error);
    return null;
  }
}

function dispatchEvent<K extends AppEventName>(eventName: K, payload: AppEventPayloadMap[K]) {
  listeners[eventName].forEach((listener) => {
    listener(payload);
  });
}

function bindEventListener<K extends AppEventName>(source: EventSource, eventName: K) {
  source.addEventListener(eventName, (event) => {
    const payload = parseEventPayload<AppEventPayloadMap[K]>(event);

    if (!payload) {
      return;
    }

    dispatchEvent(eventName, payload);
  });
}

function ensureEventSource() {
  if (typeof window === "undefined" || eventSource || !hasActiveListeners()) {
    return;
  }

  const streamUrl = buildAppEventStreamUrl();

  if (!streamUrl) {
    return;
  }

  const source = new EventSource(streamUrl);
  eventSource = source;

  bindEventListener(source, "classify-complete");
  bindEventListener(source, "rag-job-updated");
  bindEventListener(source, "support-ticket-updated");
  bindEventListener(source, "template-match-updated");
  bindEventListener(source, "notification-updated");
  bindEventListener(source, "network_test");
  bindEventListener(source, "os");
  bindEventListener(source, "vpn");

  source.onerror = () => {
    if (eventSource?.readyState === EventSource.CLOSED) {
      closeEventSource();
    }
  };
}

export function subscribeAppEvent<K extends AppEventName>(
  eventName: K,
  listener: AppEventListener<K>,
) {
  listeners[eventName].add(listener);
  ensureEventSource();

  return () => {
    listeners[eventName].delete(listener);

    if (!hasActiveListeners()) {
      closeEventSource();
    }
  };
}
