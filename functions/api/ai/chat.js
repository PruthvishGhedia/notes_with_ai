import { errorJson, json, parseJsonBody } from "../../_shared/http.js";
import {
  DEFAULT_MODEL,
  NVIDIA_CHAT_URL,
  buildAiPrompt,
  getRelatedNotes,
  loadNotes,
  noteSummary
} from "../../_shared/notes.js";
import { requireAuth } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  const unauthorized = requireAuth(context.request, context.env);
  if (unauthorized) {
    return unauthorized;
  }

  const { request, env } = context;

  if (!env.NVIDIA_API_KEY) {
    return errorJson(400, "AI is not configured.", "Set NVIDIA_API_KEY in Cloudflare Pages secrets.");
  }

  try {
    const payload = await parseJsonBody(request);
    const prompt = String(payload.prompt || "").trim();

    if (!prompt) {
      return errorJson(400, "Prompt is required.");
    }

    const notes = await loadNotes(env);
    const activeNote = notes.find((note) => note.id === payload.noteId) || null;
    const relatedNotes = getRelatedNotes(activeNote, notes);

    const upstream = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.NVIDIA_MODEL || DEFAULT_MODEL,
        temperature: 0.35,
        max_tokens: 1100,
        messages: [
          {
            role: "user",
            content: buildAiPrompt({
              mode: payload.mode,
              prompt,
              note: activeNote,
              relatedNotes
            })
          }
        ]
      })
    });

    const responseText = await upstream.text();
    let parsedResponse = {};

    try {
      parsedResponse = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsedResponse = { raw: responseText };
    }

    if (!upstream.ok) {
      return errorJson(
        upstream.status,
        "NVIDIA API request failed.",
        parsedResponse.error || parsedResponse.raw || responseText
      );
    }

    const reply = parsedResponse?.choices?.[0]?.message?.content?.trim();

    return json({
      reply: reply || "No response returned by the model.",
      model: env.NVIDIA_MODEL || DEFAULT_MODEL,
      relatedNotes: relatedNotes.map(noteSummary)
    });
  } catch (error) {
    return errorJson(500, "AI request failed.", error.message);
  }
}
