const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const NOTES_PATH = path.join(DATA_DIR, "notes.json");
const SEED_NOTES_PATH = path.join(DATA_DIR, "seed-notes.json");
const CONFIG_PATH = path.join(ROOT_DIR, "config.local.json");

const DEFAULT_PORT = 3210;
const DEFAULT_MODEL = "qwen/qwen3-coder-480b-a35b-instruct";
const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadLocalConfig() {
  if (!(await fileExists(CONFIG_PATH))) {
    return {};
  }

  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to parse config.local.json:", error.message);
    return {};
  }
}

async function ensureNotesFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  if (await fileExists(NOTES_PATH)) {
    return;
  }

  const seedRaw = await fs.readFile(SEED_NOTES_PATH, "utf8");
  await fs.writeFile(NOTES_PATH, seedRaw, "utf8");
}

async function readNotes() {
  await ensureNotesFile();
  const raw = await fs.readFile(NOTES_PATH, "utf8");
  const notes = JSON.parse(raw);
  return Array.isArray(notes) ? notes : [];
}

async function writeNotes(notes) {
  await fs.writeFile(NOTES_PATH, JSON.stringify(notes, null, 2), "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message, details) {
  sendJson(response, statusCode, {
    error: message,
    details
  });
}

async function parseBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("Request body too large.");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const bodyText = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(bodyText);
}

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof input === "string") {
    return [...new Set(input.split(",").map((item) => item.trim()).filter(Boolean))];
  }

  return [];
}

function normalizeNote(payload = {}, existingNote = {}) {
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

function noteSummary(note) {
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

function getRelatedNotes(activeNote, notes) {
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

function buildAiPrompt({ mode, prompt, note, relatedNotes }) {
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

async function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendError(response, 403, "Forbidden.");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  } catch {
    sendError(response, 404, "File not found.");
  }
}

function getRuntimeConfig(localConfig) {
  return {
    port: Number(process.env.PORT || localConfig.port || DEFAULT_PORT),
    nvidiaApiKey: process.env.NVIDIA_API_KEY || localConfig.nvidiaApiKey || "",
    nvidiaModel: process.env.NVIDIA_MODEL || localConfig.nvidiaModel || DEFAULT_MODEL
  };
}

async function handleApi(request, response, pathname, runtimeConfig) {
  const method = request.method || "GET";
  const notes = await readNotes();

  if (pathname === "/api/config" && method === "GET") {
    sendJson(response, 200, {
      aiConfigured: Boolean(runtimeConfig.nvidiaApiKey),
      model: runtimeConfig.nvidiaModel,
      provider: "NVIDIA Builder"
    });
    return;
  }

  if (pathname === "/api/notes" && method === "GET") {
    const orderedNotes = [...notes].sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
    sendJson(response, 200, { notes: orderedNotes });
    return;
  }

  if (pathname === "/api/notes" && method === "POST") {
    const payload = await parseBody(request);
    const note = normalizeNote(payload);
    const nextNotes = [note, ...notes];
    await writeNotes(nextNotes);
    sendJson(response, 201, { note });
    return;
  }

  if (pathname.startsWith("/api/notes/") && method === "PUT") {
    const noteId = pathname.split("/").pop();
    const noteIndex = notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) {
      sendError(response, 404, "Note not found.");
      return;
    }

    const payload = await parseBody(request);
    const updatedNote = normalizeNote(payload, notes[noteIndex]);
    const nextNotes = [...notes];
    nextNotes[noteIndex] = updatedNote;
    await writeNotes(nextNotes);
    sendJson(response, 200, { note: updatedNote });
    return;
  }

  if (pathname.startsWith("/api/notes/") && method === "DELETE") {
    const noteId = pathname.split("/").pop();
    const nextNotes = notes.filter((note) => note.id !== noteId);

    if (nextNotes.length === notes.length) {
      sendError(response, 404, "Note not found.");
      return;
    }

    await writeNotes(nextNotes);
    response.writeHead(204);
    response.end();
    return;
  }

  if (pathname === "/api/ai/chat" && method === "POST") {
    if (!runtimeConfig.nvidiaApiKey) {
      sendError(
        response,
        400,
        "AI is not configured.",
        "Set NVIDIA_API_KEY or create config.local.json from config.example.json."
      );
      return;
    }

    const payload = await parseBody(request);
    const prompt = String(payload.prompt || "").trim();

    if (!prompt) {
      sendError(response, 400, "Prompt is required.");
      return;
    }

    const activeNote = notes.find((note) => note.id === payload.noteId) || null;
    const relatedNotes = getRelatedNotes(activeNote, notes);

    const upstream = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtimeConfig.nvidiaApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: runtimeConfig.nvidiaModel,
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
      sendError(
        response,
        upstream.status,
        "NVIDIA API request failed.",
        parsedResponse.error || parsedResponse.raw || responseText
      );
      return;
    }

    const reply = parsedResponse?.choices?.[0]?.message?.content?.trim();

    sendJson(response, 200, {
      reply: reply || "No response returned by the model.",
      model: runtimeConfig.nvidiaModel,
      relatedNotes: relatedNotes.map(noteSummary)
    });
    return;
  }

  if (pathname === "/health" && method === "GET") {
    sendJson(response, 200, { ok: true });
    return;
  }

  sendError(response, 404, "Route not found.");
}

async function createServer() {
  await ensureNotesFile();
  const localConfig = await loadLocalConfig();
  const runtimeConfig = getRuntimeConfig(localConfig);

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = requestUrl.pathname;

    try {
      if (pathname.startsWith("/api/") || pathname === "/health") {
        await handleApi(request, response, pathname, runtimeConfig);
        return;
      }

      await serveStatic(response, pathname);
    } catch (error) {
      console.error(error);
      sendError(response, 500, "Internal server error.", escapeHtml(error.message || "Unknown error."));
    }
  });

  server.listen(runtimeConfig.port, () => {
    console.log(`ForgePad running at http://localhost:${runtimeConfig.port}`);
    if (!runtimeConfig.nvidiaApiKey) {
      console.log("AI is disabled until NVIDIA_API_KEY or config.local.json is provided.");
    }
  });
}

createServer();
