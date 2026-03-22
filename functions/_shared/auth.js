import { errorJson } from "./http.js";

export function isAuthorized(request, env) {
  const expected = String(env.APP_PASSWORD || "").trim();
  if (!expected) {
    return true;
  }

  const provided =
    request.headers.get("x-app-password") ||
    request.headers.get("x-auth-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  return provided === expected;
}

export function requireAuth(request, env) {
  return isAuthorized(request, env)
    ? null
    : errorJson(401, "Unauthorized.", "Provide the correct app password to access this personal workspace.");
}

