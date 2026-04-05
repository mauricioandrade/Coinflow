import { apiClient } from "@/lib/api/client";
import type { AuthTokens } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const authService = {
  /**
   * Authenticate with email + password.
   * Returns tokens; caller is responsible for storing them.
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(
      "/auth/login",
      payload,
    );
    return data;
  },

  /**
   * Create a new account.
   */
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>(
      "/auth/register",
      payload,
    );
    return data;
  },

  /**
   * Persist the session server-side (sets HttpOnly cookies) and return
   * the access token. Called after login/register.
   *
   * This hits our own Next.js Route Handler — not the backend directly —
   * so it can set HttpOnly cookies from the server.
   */
  async persistSession(tokens: AuthTokens): Promise<{ accessToken: string }> {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokens),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to persist session");
    return res.json() as Promise<{ accessToken: string }>;
  },

  /**
   * Clear the server-side session (removes HttpOnly cookies).
   */
  async logout(): Promise<void> {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
  },
};
