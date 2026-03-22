import { seedNotes } from "./seed.js";

export const DEFAULT_MODEL = "qwen/qwen3-coder-480b-a35b-instruct";
export const NOTES_STORAGE_KEY = "forgepad:notes";
export const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function ensureKv(env) {
  if (!env.NOTES_KV) {
    throw new Error("Missing NOTES_KV binding.");
  }
  return env.NOTES_KV;
}

export async function loadNotes(env) {
  const kv = ensureKv(env);
  const raw = await kv.get(NOTES_STORAGE_KEY);

  if (!raw) {
    await kv.put(NOTES_STORAGE_KEY, JSON.stringify(seedNotes));
    return structuredClone(seedNotes);
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : structuredClone(seedNotes);
  } catch {
    await kv.put(NOTES_STORAGE_KEY, JSON.stringify(seedNotes));
    return structuredClone(seedNotes);
  }
}

export async function saveNotes(env, notes) {
  const kv = ensureKv(env);
  await kv.put(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function normalizeTags(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof input === "string") {
    return [...new Set(input.split(",").map((item) => item.trim()).filter(Boolean))];
  }

  return [];
}

export function normalizeNote(payload = {}, existingNote = {}) {
  const now = new Date().toISOString();
  const title = String(payload.title ?? existingNote.title ?? "Untitled note").trim() || "Untitled note";

  return {
    id: existingNote.id ?? crypto.randomUUID(),
    title,
    project: String(payload.project ?? existingNote.project ?? "").trim(),
    language: String(payload.language ?? existingNote.language ?? "markdown").trim() || "markdown",
    tags: normalizeTags(payload.tags ?? existingNote.tags),
    pinned: Boolean(payload.pinned ?? existingNote.pinned),
    archived: Boolean(payload.archived ?? existingNote.archived),
    content: String(payload.content ?? existingNote.content ?? ""),
    createdAt: existingNote.createdAt ?? now,
    updatedAt: now
  };
}

export function noteSummary(note) {
  return {
    id: note.id,
    title: note.title,
    project: note.project,
    tags: note.tags,
    updatedAt: note.updatedAt
  };
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9_+-]+/i)
    .filter(Boolean);
}

function scoreRelatedness(note, targetTokens) {
  if (targetTokens.length === 0) {
    return 0;
  }

  const noteTokens = new Set(
    tokenize(note.title)
      .concat(tokenize(note.project))
      .concat(note.tags.flatMap(tokenize))
      .concat(tokenize(note.content).slice(0, 150))
  );

  let score = 0;
  for (const token of targetTokens) {
    if (noteTokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

export function getRelatedNotes(activeNote, notes) {
  if (!activeNote) {
    return [];
  }

  const activeTokens = tokenize(activeNote.title)
    .concat(tokenize(activeNote.project))
    .concat(activeNote.tags.flatMap(tokenize));

  return notes
    .filter((note) => note.id !== activeNote.id && !note.archived)
    .map((note) => ({ note, score: scoreRelatedness(note, activeTokens) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((entry) => entry.note);
}

export function buildAiPrompt({ mode, prompt, note, relatedNotes }) {
  const modeInstructions = {
    chat: "Answer the user's question using the note context when relevant.",
    summarize: "Write a compact but useful summary with headings when needed.",
    todos: "Extract actionable next steps as a checklist.",
    refine: "Rewrite the note to be clearer, tighter and more developer-friendly."
  };

  const activeMode = modeInstructions[mode] ? mode : "chat";
  const currentNoteBlock = note
    ? `Current note:\nTitle: ${note.title}\nProject: ${note.project || "None"}\nLanguage: ${note.language}\nTags: ${note.tags.join(", ") || "None"}\nContent:\n${note.content}`
    : "Current note: none selected.";

  const relatedBlock = relatedNotes.length
    ? relatedNotes
        .map(
          (item, index) =>
            `Related note ${index + 1}:\nTitle: ${item.title}\nProject: ${item.project || "None"}\nTags: ${item.tags.join(", ") || "None"}\nContent:\n${item.content}`
        )
        .join("\n\n")
    : "Related notes: none.";

  return [
    "You are an AI assistant inside a developer-first notes app.",
    "Prioritize precision, useful structure and practical output over filler.",
    modeInstructions[activeMode],
    currentNoteBlock,
    relatedBlock,
    `User request:\n${prompt || "Help me improve this note."}`
  ].join("\n\n");
}

