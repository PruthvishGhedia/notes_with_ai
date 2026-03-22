import { json } from "../_shared/http.js";
import { DEFAULT_MODEL } from "../_shared/notes.js";
import { isAuthorized } from "../_shared/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const authenticated = isAuthorized(request, env);

  return json({
    appProtected: Boolean(String(env.APP_PASSWORD || "").trim()),
    authenticated,
    aiConfigured: authenticated ? Boolean(env.NVIDIA_API_KEY) : false,
    model: authenticated ? env.NVIDIA_MODEL || DEFAULT_MODEL : "",
    provider: "NVIDIA Builder",
    storage: "Cloudflare KV"
  });
}

