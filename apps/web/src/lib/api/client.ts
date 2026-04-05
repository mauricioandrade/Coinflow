import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenService } from "@/features/auth/services/token.service";
import { isApiError } from "./types";

// ── Singleton Axios instance ──────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
  // Send cookies (cf_session HttpOnly refresh hint) on every request.
  withCredentials: true,
  timeout: 15_000,
});

// ── Request interceptor — attach Bearer token ─────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor — handle 401 / 403 ──────────────────────────────────

// Flag to prevent infinite refresh loops
let isRefreshing = false;

// Queue of requests waiting for the token refresh to complete
type FailedRequest = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let pendingQueue: FailedRequest[] = [];

function processQueue(error: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,

  async (error: unknown) => {
    if (!isApiError(error)) return Promise.reject(error);

    const originalRequest = error.config;
    const status = error.response?.status;

    // ── 403 Forbidden — user lacks permission, do not retry ─────────────
    if (status === 403) {
      // Propagate as-is; the calling code handles the UI feedback.
      return Promise.reject(error);
    }

    // ── 401 Unauthorized — attempt silent token refresh ─────────────────
    if (status === 401 && originalRequest && !("_retry" in originalRequest)) {
      if (isRefreshing) {
        // Another refresh is already in flight — queue this request.
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      // Mark this request so we don't retry it a second time
      (originalRequest as unknown as Record<string, unknown>)["_retry"] = true;
      isRefreshing = true;

      try {
        // Call the Next.js Route Handler which calls the backend /auth/refresh
        // and rotates the HttpOnly session cookie server-side.
        const refreshRes = await axios.post<{ accessToken: string }>(
          "/api/auth/refresh",
          {},
          { withCredentials: true },
        );

        const newToken = refreshRes.data.accessToken;
        tokenService.setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — session expired, force logout
        processQueue(refreshError, null);
        tokenService.clearAll();
        // Redirect to login (works in both browser and during hydration)
        if (typeof window !== "undefined") {
          window.location.href = "/login?session=expired";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
