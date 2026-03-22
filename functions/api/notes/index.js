import { errorJson, json, parseJsonBody } from "../../_shared/http.js";
import { loadNotes, normalizeNote, saveNotes } from "../../_shared/notes.js";
import { requireAuth } from "../../_shared/auth.js";

export async function onRequest(context) {
  const unauthorized = requireAuth(context.request, context.env);
  if (unauthorized) {
    return unauthorized;
  }

  const { request, env } = context;
  const method = request.method.toUpperCase();

  try {
    const notes = await loadNotes(env);

    if (method === "GET") {
      const orderedNotes = [...notes].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
      return json({ notes: orderedNotes });
    }

    if (method === "POST") {
      const payload = await parseJsonBody(request);
      const note = normalizeNote(payload);
      await saveNotes(env, [note, ...notes]);
      return json({ note }, { status: 201 });
    }

    return errorJson(405, "Method not allowed.");
  } catch (error) {
    return errorJson(500, "Notes API failed.", error.message);
  }
}

