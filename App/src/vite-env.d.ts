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

type MailyUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "latest"
  | "error"
  | "unsupported";

interface MailyUpdateState {
  status: MailyUpdateStatus;
  version: string | null;
  releaseDate: string | null;
  percent: number | null;
  error: string | null;
}

interface Window {
  readonly mailyUpdater?: {
    getState: () => Promise<MailyUpdateState>;
    check: () => Promise<MailyUpdateState>;
    download: () => Promise<MailyUpdateState>;
    install: () => Promise<MailyUpdateState>;
    onStatus: (
      callback: (state: MailyUpdateState) => void,
    ) => () => void;
  };
  readonly mailyShell?: {
    openExternal: (url: string) => Promise<boolean>;
  };
  readonly mailyDeepLink?: {
    onOpen: (callback: (url: string) => void) => () => void;
  };
}
