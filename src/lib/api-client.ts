import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';

import type {
  AuthForgotPasswordRequest,
  AuthForgotPasswordResponse,
  AuthResetPasswordRequest,
  AuthResetPasswordResponse,
  AuthSendOtpRequest,
  AuthSendOtpResponse,
  AuthVerifyOtpRequest,
  AuthVerifyOtpResponse,
} from '../types/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://bosma-uz.onrender.com/api';

const ACCESS_TOKEN_KEY = 'bosma.accessToken';
const REFRESH_TOKEN_KEY = 'bosma.refreshToken';

type CookieOptions = {
  expires?: number | Date;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
};

function getDefaultCookieOptions(): CookieOptions {
  return {
    path: '/',
    sameSite: 'lax',
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  };
}

export function getAccessToken(): string | null {
  return Cookies.get(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string | null) {
  if (!token) {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: '/' });
    return;
  }
  Cookies.set(ACCESS_TOKEN_KEY, token, {
    ...getDefaultCookieOptions(),
    // short-lived; browser session by default
  });
}

export function getRefreshToken(): string | null {
  return Cookies.get(REFRESH_TOKEN_KEY) ?? null;
}

export function setRefreshToken(token: string | null) {
  if (!token) {
    Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
    return;
  }
  Cookies.set(REFRESH_TOKEN_KEY, token, {
    ...getDefaultCookieOptions(),
    // keep refresh token around (7 days)
    expires: 7,
  });
}

export function clearAuthTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiClientError extends Error {
  status?: number;
  body?: ApiErrorBody;

  constructor(message: string, opts?: { status?: number; body?: ApiErrorBody }) {
    super(message);
    this.name = 'ApiClientError';
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

function normalizeError(err: unknown): ApiClientError {
  if (!axios.isAxiosError(err)) {
    return new ApiClientError('Unknown error');
  }

  const axiosErr = err as AxiosError<ApiErrorBody>;
  const status = axiosErr.response?.status;
  const body = axiosErr.response?.data;

  const msgFromBody =
    typeof body?.message === 'string'
      ? body.message
      : Array.isArray(body?.message)
        ? body?.message.join(', ')
        : undefined;

  return new ApiClientError(
    msgFromBody || axiosErr.message || 'Request failed',
    { status, body },
  );
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function pushToRefreshQueue(cb: (token: string | null) => void) {
  refreshQueue.push(cb);
}

function resolveRefreshQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

async function tryRefreshAccessToken(client: AxiosInstance): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await client.post<{ accessToken: string }>(
      '/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true } as any,
    );

    const newAccessToken = res.data?.accessToken;
    if (!newAccessToken) return null;

    setAccessToken(newAccessToken);
    return newAccessToken;
  } catch {
    clearAuthTokens();
    return null;
  }
}

type ApiAxiosRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

type ApiInternalAxiosRequestConfig = InternalAxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Needed if backend uses cookies in addition to bearer tokens.
  withCredentials: true,
});

apiClient.interceptors.request.use((config: ApiInternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: unknown) => {
    if (!axios.isAxiosError(err)) {
      throw normalizeError(err);
    }

    const axiosErr = err as AxiosError<ApiErrorBody>;
    const status = axiosErr.response?.status;
    const originalRequest = axiosErr.config as ApiInternalAxiosRequestConfig | undefined;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest.skipAuthRefresh ||
      (originalRequest.url ?? '').includes('/auth/login') ||
      (originalRequest.url ?? '').includes('/auth/register')
    ) {
      throw normalizeError(err);
    }

    if (isRefreshing) {
      return await new Promise((resolve, reject) => {
        pushToRefreshQueue((token) => {
          if (!token) {
            reject(normalizeError(axiosErr));
            return;
          }
          originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await tryRefreshAccessToken(apiClient);
      resolveRefreshQueue(newToken);

      if (!newToken) {
        throw normalizeError(axiosErr);
      }

      originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return await apiClient(originalRequest);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  try {
    const res = await apiClient.get<T>(url, config);
    return res.data;
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  try {
    const res = await apiClient.post<TResponse>(url, body, config);
    return res.data;
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function apiPatch<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  try {
    const res = await apiClient.patch<TResponse>(url, body, config);
    return res.data;
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function apiDelete<TResponse>(url: string, config?: AxiosRequestConfig) {
  try {
    const res = await apiClient.delete<TResponse>(url, config);
    return res.data;
  } catch (e) {
    throw normalizeError(e);
  }
}

export async function uploadAsset(file: File) {
  const form = new FormData();
  form.append('file', file);

  return apiPost<{ id: number; url: string; userId: number; createdAt: string }, FormData>(
    '/assets/upload',
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

export function sendOtp(dto: AuthSendOtpRequest) {
  return apiPost<AuthSendOtpResponse, AuthSendOtpRequest>('/auth/send-otp', dto);
}

export function verifyOtp(dto: AuthVerifyOtpRequest) {
  return apiPost<AuthVerifyOtpResponse, AuthVerifyOtpRequest>('/auth/verify-otp', dto);
}

export function forgotPassword(dto: AuthForgotPasswordRequest) {
  return apiPost<AuthForgotPasswordResponse, AuthForgotPasswordRequest>(
    '/auth/forgot-password',
    dto,
  );
}

export function resetPassword(dto: AuthResetPasswordRequest) {
  return apiPost<AuthResetPasswordResponse, AuthResetPasswordRequest>(
    '/auth/reset-password',
    dto,
  );
}
