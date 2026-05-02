import axios from "axios";
import { clearAppSession, getAccessToken } from "../lib/app-session";

type ErrorPayload = {
  message?: string;
  result_req?: string;
  result_code?: number;
};

type ApiClientOptions = {
  networkErrorMessage?: string;
  networkErrorEventName?: string;
};

const DEFAULT_NETWORK_ERROR_MESSAGE =
  "서버와의 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.";

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

export function createApiClient(baseURL: string, options: ApiClientOptions = {}) {
  const client = axios.create({
    baseURL,
    headers: {
      Accept: "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    const accessToken = getAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const isAxiosError = axios.isAxiosError(error);
      const status = isAxiosError ? error.response?.status : undefined;
      const payload = isAxiosError
        ? (error.response?.data as ErrorPayload | undefined)
        : undefined;
      const isNetworkError = isAxiosError && !error.response;
      const message = isNetworkError
        ? options.networkErrorMessage ?? DEFAULT_NETWORK_ERROR_MESSAGE
        : payload?.result_req ||
        payload?.message ||
        (isAxiosError ? error.message : "요청을 처리하지 못했습니다.");
      const code = payload?.result_code;

      if (isNetworkError && options.networkErrorEventName && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(options.networkErrorEventName, {
            detail: {
              message,
              baseURL,
            },
          }),
        );
      }

      if (status === 401) {
        clearAppSession();
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.assign("/");
        }
      }

      return Promise.reject(new ApiError(message, status, code));
    },
  );

  return client;
}

export const api = createApiClient(resolveBaseUrl());

export function getErrorMessage(error: unknown, fallbackMessage = "요청을 처리하지 못했습니다.") {
  if (error instanceof ApiError) {
    return error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
