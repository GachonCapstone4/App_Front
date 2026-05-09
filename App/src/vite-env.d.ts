/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ADMIN_API_BASE_URL?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_SSE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type EmailAssistUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "latest"
  | "error"
  | "unsupported";

interface EmailAssistUpdateState {
  status: EmailAssistUpdateStatus;
  version: string | null;
  releaseDate: string | null;
  percent: number | null;
  error: string | null;
}

interface Window {
  readonly emailAssistUpdater?: {
    getState: () => Promise<EmailAssistUpdateState>;
    check: () => Promise<EmailAssistUpdateState>;
    download: () => Promise<EmailAssistUpdateState>;
    install: () => Promise<EmailAssistUpdateState>;
    onStatus: (
      callback: (state: EmailAssistUpdateState) => void,
    ) => () => void;
  };
}
