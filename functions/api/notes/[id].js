import { errorJson, json, parseJsonBody } from "../../_shared/http.js";
import { loadNotes, normalizeNote, saveNotes } from "../../_shared/notes.js";
import { requireAuth } from "../../_shared/auth.js";

export async function onRequest(context) {
  const unauthorized = requireAuth(context.request, context.env);
  if (unauthorized) {
    return unauthorized;
  }

  const { request, env, params } = context;
  const method = request.method.toUpperCase();
  const noteId = params.id;

  try {
    const notes = await loadNotes(env);
    const noteIndex = notes.findIndex((note) => note.id === noteId);

    if (method === "PUT") {
      if (noteIndex === -1) {
        return errorJson(404, "Note not found.");
      }

      const payload = await parseJsonBody(request);
      const updatedNote = normalizeNote(payload, notes[noteIndex]);
      const nextNotes = [...notes];
      nextNotes[noteIndex] = updatedNote;
      await saveNotes(env, nextNotes);
      return json({ note: updatedNote });
    }

    if (method === "DELETE") {
      if (noteIndex === -1) {
        return errorJson(404, "Note not found.");
      }

      const nextNotes = notes.filter((note) => note.id !== noteId);
      await saveNotes(env, nextNotes);
      return new Response(null, { status: 204 });
    }

    return errorJson(405, "Method not allowed.");
  } catch (error) {
    return errorJson(500, "Notes mutation failed.", error.message);
  }
}

