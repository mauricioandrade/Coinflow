import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthTokens } from "@/types";

const SECURE = process.env.NODE_ENV === "production";
// 7 days in seconds (matches backend JWT_REFRESH_EXPIRES_IN)
const REFRESH_TTL = 7 * 24 * 60 * 60;
// 15 minutes in seconds (matches backend JWT_EXPIRES_IN)
const ACCESS_TTL = 15 * 60;

/**
 * POST /api/auth/session
 *
 * Called by the client after a successful login or register.
 * Receives { accessToken, refreshToken } and sets:
 *  - cf_rt:      HttpOnly Secure SameSite=Strict — refresh token
 *  - cf_session: HttpOnly Secure SameSite=Strict — presence hint for middleware
 *
 * Returns { accessToken } so the client can store it in memory.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: Partial<AuthTokens>;
  try {
    body = (await request.json()) as Partial<AuthTokens>;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }

  const { accessToken, refreshToken } = body;
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { message: "accessToken and refreshToken are required" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();

  // HttpOnly: JS cannot read this — immune to XSS token theft
  cookieStore.set("cf_rt", refreshToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "strict",
    maxAge: REFRESH_TTL,
    path: "/",
  });

  // Session hint: tells middleware a session exists
  cookieStore.set("cf_session", "1", {
    httpOnly: true,
    secure: SECURE,
    sameSite: "strict",
    maxAge: ACCESS_TTL,
    path: "/",
  });

  return NextResponse.json({ accessToken });
}

/**
 * DELETE /api/auth/session
 *
 * Clears all session cookies. Called on logout.
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.delete("cf_rt");
  cookieStore.delete("cf_session");
  cookieStore.delete("cf_at");
  return NextResponse.json({ ok: true });
}
