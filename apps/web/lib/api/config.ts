/**
 * Centralized API configuration for Web -> NestJS API communication.
 * Default local URL targets the NestJS API gateway on port 4000 (/api/v1).
 */

const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export function getApiBaseUrl(): string {
  // Prefer server-side override if defined in server context, otherwise client-accessible public URL
  const url =
    (typeof window === "undefined" ? process.env.API_URL : undefined) ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_URL;

  // Trim trailing slashes for consistent URL joining
  return url.replace(/\/+$/, "");
}
