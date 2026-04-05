"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService, type LoginPayload } from "../services/auth.service";
import { tokenService } from "../services/token.service";
import { getErrorMessage } from "@/lib/api/types";

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      // 1. Authenticate with the backend
      const authRes = await authService.login(payload);

      // 2. Store tokens server-side (HttpOnly cookies) via Route Handler
      await authService.persistSession({
        accessToken: authRes.accessToken,
        refreshToken: authRes.refreshToken,
      });

      // 3. Keep access token in memory for immediate use
      tokenService.setAccessToken(authRes.accessToken);

      return authRes;
    },
    onSuccess: () => {
      router.push("/");
      router.refresh(); // re-run server components with new session
    },
    onError: (error) => {
      // Error message is consumed by the form component via mutation.error
      return getErrorMessage(error);
    },
  });
}

export function useLogout() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      tokenService.clearAll();
      await authService.logout();
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });
}
