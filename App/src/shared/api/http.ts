import axios from "axios";
import { clearAppSession, getAccessToken } from "../lib/app-session";

type ErrorPayload = {
  message?: string;
  result_req?: string;
  result_code?: number;
};

export class ApiError extends Error {
  status?: number;
  code?: number;

  constructor(message: string, status?: number, code?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function resolveBaseUrl() {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : "/";
}

export function getApiBaseUrl() {
  return resolveBaseUrl();
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const payload = axios.isAxiosError(error)
      ? (error.response?.data as ErrorPayload | undefined)
      : undefined;
    const message =
      payload?.result_req ||
      payload?.message ||
      (axios.isAxiosError(error) ? error.message : "요청을 처리하지 못했습니다.");
    const code = payload?.result_code;

    if (status === 401) {
      clearAppSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

    return Promise.reject(new ApiError(message, status, code));
  },
);

export function getErrorMessage(error: unknown, fallbackMessage = "요청을 처리하지 못했습니다.") {
  if (error instanceof ApiError) {
    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
