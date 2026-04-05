import type { AxiosError } from "axios";

/** Shape of the error body returned by the NestJS backend. */
export interface BackendError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiAxiosError = AxiosError<BackendError>;

/** Typed guard — narrows unknown to ApiAxiosError. */
export function isApiError(error: unknown): error is ApiAxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as ApiAxiosError).isAxiosError === true
  );
}

/** Extract a user-friendly message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === "string") return data.message;
  }
  if (error instanceof Error) return error.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}
