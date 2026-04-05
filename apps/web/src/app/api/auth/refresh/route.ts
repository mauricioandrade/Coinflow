import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
const SECURE = process.env.NODE_ENV === "production";
const ACCESS_TTL = 15 * 60;

/**
 * POST /api/auth/refresh
 *
 * Reads the HttpOnly cf_rt cookie (refresh token) and calls the NestJS
 * backend /auth/refresh endpoint. On success:
 *  - Updates the cf_session hint cookie
 *  - Returns the new accessToken to the client
 *
 * This handler acts as a BFF (Backend For Frontend) proxy — the raw
 * refresh token never leaves the server boundary.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("cf_rt")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { message: "No refresh token" },
      { status: 401 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach authentication server" },
      { status: 503 },
    );
  }

  if (!backendRes.ok) {
    // Refresh token is invalid or expired — clear cookies
    cookieStore.delete("cf_rt");
    cookieStore.delete("cf_session");
    return NextResponse.json(
      { message: "Session expired. Please log in again." },
      { status: 401 },
    );
  }

  const { accessToken, refreshToken: newRefreshToken } =
    (await backendRes.json()) as {
      accessToken: string;
      refreshToken?: string;
    };

  // Rotate the refresh token if the backend issues a new one
  if (newRefreshToken) {
    cookieStore.set("cf_rt", newRefreshToken, {
      httpOnly: true,
      secure: SECURE,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
  }

  // Extend the session hint
  cookieStore.set("cf_session", "1", {
    httpOnly: true,
    secure: SECURE,
    sameSite: "strict",
    maxAge: ACCESS_TTL,
    path: "/",
  });

  return NextResponse.json({ accessToken });
}
