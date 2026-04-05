import { SetMetadata } from "@nestjs/common";

/**
 * @Public() — marks a route as publicly accessible (no JWT required).
 *
 * Use ONLY for:
 *  - POST /auth/login
 *  - POST /auth/register
 *  - POST /auth/refresh
 *  - POST /webhooks/* (Open Finance inbound events)
 *
 * The JwtAuthGuard checks for this metadata before enforcing authentication.
 * Every other route is private by default.
 */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
