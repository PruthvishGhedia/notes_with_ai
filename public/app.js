const state = {
  notes: [],
  selectedId: null,
  query: "",
  sort: "updated",
  view: "all",
  activeProject: "all",
  activeTag: "all",
  preview: false,
  saveStatus: "Idle",
  saveTimer: null,
  commandOpen: false,
  commandQuery: "",
  aiMode: "summarize",
  aiBusy: false,
  config: {
    aiConfigured: false,
    model: "",
    provider: ""
  }
};

const elements = {
  viewList: document.querySelector("#view-list"),
  projectList: document.querySelector("#project-list"),
  tagList: document.querySelector("#tag-list"),
  projectCount: document.querySelector("#project-count"),
  tagCount: document.querySelector("#tag-count"),
  searchInput: document.querySelector("#search-input"),
  sortSelect: document.querySelector("#sort-select"),
  previewToggle: document.querySelector("#preview-toggle"),
  visibleCount: document.querySelector("#visible-count"),
  notesList: document.querySelector("#notes-list"),
  editorHeading: document.querySelector("#editor-heading"),
  saveStatus: document.querySelector("#save-status"),
  noteTitle: document.querySelector("#note-title"),
  noteProject: document.querySelector("#note-project"),
  noteLanguage: document.querySelector("#note-language"),
  noteTags: document.querySelector("#note-tags"),
  noteContent: document.querySelector("#note-content"),
  previewPane: document.querySelector("#preview-pane"),
  pinButton: document.querySelector("#pin-button"),
  archiveButton: document.querySelector("#archive-button"),
  duplicateButton: document.querySelector("#duplicate-button"),
  saveButton: document.querySelector("#save-button"),
  deleteButton: document.querySelector("#delete-button"),
  newNoteButton: document.querySelector("#new-note-button"),
  commandButton: document.querySelector("#command-button"),
  commandPalette: document.querySelector("#command-palette"),
  commandInput: document.querySelector("#command-input"),
  commandResults: document.querySelector("#command-results"),
  closeCommand: document.querySelector("#close-command"),
  aiBadge: document.querySelector("#ai-badge"),
  aiPrompt: document.querySelector("#ai-prompt"),
  askAiButton: document.querySelector("#ask-ai-button"),
  aiResponse: document.querySelector("#ai-response"),
  aiRelated: document.querySelector("#ai-related"),
  aiModel: document.querySelector("#ai-model"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button"))
};

const smartViews = [
  { key: "all", label: "All notes" },
  { key: "pinned", label: "Pinned" },
  { key: "recent", label: "Recent" },
  { key: "archived", label: "Archived" }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function toSnippet(content) {
  return content.replace(/\s+/g, " ").trim().slice(0, 120) || "No content yet.";
}

function noteMatches(note, query) {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  const haystack = [note.title, note.project, note.language, note.tags.join(" "), note.content]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function getVisibleNotes() {
  const now = Date.now();

  return [...state.notes]
    .filter((note) => {
      if (state.view === "pinned" && !note.pinned) {
        return false;
      }

      if (state.view === "archived" && !note.archived) {
        return false;
      }

      if (state.view !== "archived" && note.archived) {
        return false;
      }

      if (state.view === "recent") {
        const updatedAgo = now - new Date(note.updatedAt).getTime();
        if (updatedAgo > 1000 * 60 * 60 * 24 * 14) {
          return false;
        }
      }

      if (state.activeProject !== "all" && note.project !== state.activeProject) {
        return false;
      }

      if (state.activeTag !== "all" && !note.tags.includes(state.activeTag)) {
        return false;
      }

      return noteMatches(note, state.query);
    })
    .sort((left, right) => {
      if (state.sort === "title") {
        return left.title.localeCompare(right.title);
      }

      if (state.sort === "created") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

function getSelectedNote() {
  return state.notes.find((note) => note.id === state.selectedId) || null;
}

function ensureSelectedNote() {
  const visible = getVisibleNotes();
  if (visible.length === 0) {
    state.selectedId = null;
    return;
  }

  const selectedVisible = visible.some((note) => note.id === state.selectedId);
  if (!selectedVisible) {
    state.selectedId = visible[0].id;
  }
}

function renderSmartViews() {
  const counts = {
    all: state.notes.filter((note) => !note.archived).length,
    pinned: state.notes.filter((note) => note.pinned && !note.archived).length,
    recent: state.notes.filter((note) => Date.now() - new Date(note.updatedAt).getTime() <= 1000 * 60 * 60 * 24 * 14 && !note.archived).length,
    archived: state.notes.filter((note) => note.archived).length
  };

  elements.viewList.innerHTML = smartViews
    .map(
      (view) => `
        <button class="view-button ${state.view === view.key ? "active" : ""}" data-view="${view.key}">
          ${escapeHtml(view.label)} <span class="sidebar-count">${counts[view.key]}</span>
        </button>
      `
    )
    .join("");
}

function renderProjects() {
  const projects = [...new Set(state.notes.map((note) => note.project).filter(Boolean))].sort();
  elements.projectCount.textContent = String(projects.length);
  elements.projectList.innerHTML = [
    `<button class="filter-button ${state.activeProject === "all" ? "active" : ""}" data-project="all">All projects</button>`,
    ...projects.map(
      (project) =>
        `<button class="filter-button ${state.activeProject === project ? "active" : ""}" data-project="${escapeHtml(project)}">${escapeHtml(project)}</button>`
    )
  ].join("");
}

function renderTags() {
  const tags = [...new Set(state.notes.flatMap((note) => note.tags))].sort();
  elements.tagCount.textContent = String(tags.length);
  elements.tagList.innerHTML = [
    `<button class="tag-chip ${state.activeTag === "all" ? "active" : ""}" data-tag="all">All tags</button>`,
    ...tags.map(
      (tag) =>
        `<button class="tag-chip ${state.activeTag === tag ? "active" : ""}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`
    )
  ].join("");
}

function renderNotesList() {
  const visibleNotes = getVisibleNotes();
  elements.visibleCount.textContent = `${visibleNotes.length} ${visibleNotes.length === 1 ? "note" : "notes"}`;

  if (visibleNotes.length === 0) {
    elements.notesList.innerHTML = `<div class="empty-state">No notes match the current filters. Clear the search or create a new note.</div>`;
    return;
  }

  elements.notesList.innerHTML = visibleNotes
    .map((note) => {
      const badges = [
        note.project ? `<span class="mini-pill">${escapeHtml(note.project)}</span>` : "",
        note.pinned ? `<span class="mini-pill">Pinned</span>` : "",
        note.archived ? `<span class="mini-pill">Archived</span>` : "",
        ...note.tags.slice(0, 3).map((tag) => `<span class="mini-pill">#${escapeHtml(tag)}</span>`)
      ].join("");

      return `
        <button class="note-card ${note.id === state.selectedId ? "active" : ""}" data-note-id="${note.id}">
          <div class="note-card-header">
            <h3>${escapeHtml(note.title)}</h3>
            <span class="mini-pill">${escapeHtml(formatDate(note.updatedAt))}</span>
          </div>
          <p>${escapeHtml(toSnippet(note.content))}</p>
          <div class="meta-row">${badges}</div>
        </button>
      `;
    })
    .join("");
}

function markdownToHtml(source) {
  const escaped = escapeHtml(source);
  const fenced = escaped.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const label = language ? `<div class="meta-copy">${language}</div>` : "";
    return `${label}<pre><code>${code.trim()}</code></pre>`;
  });

  const blocks = fenced
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");

      if (block.includes("<pre><code>")) {
        return block;
      }

      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${line.slice(2)}</li>`).join("")}</ul>`;
      }

      if (lines.every((line) => /^\d+\.\s/.test(line))) {
        return `<ol>${lines.map((line) => `<li>${line.replace(/^\d+\.\s/, "")}</li>`).join("")}</ol>`;
      }

      if (block.startsWith("### ")) {
        return `<h3>${block.slice(4)}</h3>`;
      }

      if (block.startsWith("## ")) {
        return `<h2>${block.slice(3)}</h2>`;
      }

      if (block.startsWith("# ")) {
        return `<h1>${block.slice(2)}</h1>`;
      }

      return `<p>${block.replace(/\n/g, "<br />").replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`;
    })
    .join("");

  return blocks || `<p class="placeholder-copy">Nothing to preview yet.</p>`;
}

function renderEditor() {
  const note = getSelectedNote();
  const disabled = !note;

  elements.editorHeading.textContent = note ? note.title : "No note selected";
  elements.noteTitle.value = note?.title || "";
  elements.noteProject.value = note?.project || "";
  elements.noteLanguage.value = note?.language || "";
  elements.noteTags.value = note?.tags.join(", ") || "";
  elements.noteContent.value = note?.content || "";
  elements.previewPane.innerHTML = note ? markdownToHtml(note.content) : `<p class="placeholder-copy">Choose a note to start editing.</p>`;
  elements.saveStatus.textContent = state.saveStatus;

  for (const field of [elements.noteTitle, elements.noteProject, elements.noteLanguage, elements.noteTags, elements.noteContent]) {
    field.disabled = disabled;
  }

  elements.pinButton.disabled = disabled;
  elements.archiveButton.disabled = disabled;
  elements.duplicateButton.disabled = disabled;
  elements.saveButton.disabled = disabled;
  elements.deleteButton.disabled = disabled;

  if (note) {
    elements.pinButton.textContent = note.pinned ? "Unpin" : "Pin";
    elements.archiveButton.textContent = note.archived ? "Restore" : "Archive";
  }

  elements.noteContent.classList.toggle("hidden", state.preview);
  elements.previewPane.classList.toggle("hidden", !state.preview);
  elements.previewToggle.textContent = state.preview ? "Edit" : "Preview";
}

function renderCommandPalette() {
  elements.commandPalette.classList.toggle("hidden", !state.commandOpen);

  if (!state.commandOpen) {
    return;
  }

  const query = state.commandQuery.trim().toLowerCase();
  const results = state.notes
    .filter((note) => !query || noteMatches(note, query))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);

  elements.commandResults.innerHTML = results.length
    ? results
        .map(
          (note) => `
            <button class="command-result" data-command-note="${note.id}">
              <h3>${escapeHtml(note.title)}</h3>
              <p>${escapeHtml(toSnippet(note.content))}</p>
              <div class="meta-row">
                ${note.project ? `<span class="mini-pill">${escapeHtml(note.project)}</span>` : ""}
                <span class="mini-pill">${escapeHtml(formatDate(note.updatedAt))}</span>
              </div>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state">No matching notes.</div>`;
}

function renderAiPanel(reply, relatedNotes = []) {
  elements.aiBadge.textContent = state.config.aiConfigured ? "AI ready" : "AI disabled";
  elements.aiBadge.classList.toggle("muted", !state.config.aiConfigured);
  elements.aiModel.textContent = state.config.model || "";
  elements.aiResponse.innerHTML = reply ? markdownToHtml(reply) : `<p class="placeholder-copy">Pick a note and run a summary, refinement, or question against it.</p>`;
  elements.aiRelated.innerHTML = relatedNotes.length
    ? relatedNotes
        .map(
          (note) => `
            <button class="note-card" data-related-id="${note.id}">
              <div class="note-card-header">
                <h3>${escapeHtml(note.title)}</h3>
              </div>
              <p>${escapeHtml(note.project || "No project")}</p>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state">No related notes were pulled into this response.</div>`;

  for (const button of elements.modeButtons) {
    button.classList.toggle("active", button.dataset.mode === state.aiMode);
  }
}

function renderAll() {
  ensureSelectedNote();
  renderSmartViews();
  renderProjects();
  renderTags();
  renderNotesList();
  renderEditor();
  renderCommandPalette();
  renderAiPanel(elements.aiResponse.dataset.reply || "", JSON.parse(elements.aiRelated.dataset.related || "[]"));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.details || payload.error || "Request failed.");
  }

  return payload;
}

async function loadNotes() {
  const payload = await requestJson("/api/notes");
  state.notes = payload.notes;
  ensureSelectedNote();
}

async function loadConfig() {
  const payload = await requestJson("/api/config");
  state.config = payload;
}

function replaceNote(note) {
  const index = state.notes.findIndex((entry) => entry.id === note.id);
  if (index >= 0) {
    state.notes[index] = note;
  } else {
    state.notes.unshift(note);
  }
}

function updateLocalNote(patch) {
  const note = getSelectedNote();
  if (!note) {
    return;
  }

  Object.assign(note, patch);
  state.saveStatus = "Saving...";
  renderEditor();
}

function scheduleSave() {
  const note = getSelectedNote();
  if (!note) {
    return;
  }

  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => {
    saveNote(note.id);
  }, 500);
}

async function saveNote(noteId) {
  const note = state.notes.find((entry) => entry.id === noteId);
  if (!note) {
    return;
  }

  state.saveStatus = "Saving...";
  renderEditor();

  try {
    const payload = await requestJson(`/api/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(note)
    });
    replaceNote(payload.note);
    state.saveStatus = "Saved";
  } catch (error) {
    state.saveStatus = "Save failed";
    window.alert(error.message);
  }

  renderAll();
}

async function createNote(seed = {}) {
  try {
    const payload = await requestJson("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: "Untitled note",
        project: state.activeProject !== "all" ? state.activeProject : "",
        language: "markdown",
        tags: state.activeTag !== "all" ? [state.activeTag] : [],
        content: "",
        ...seed
      })
    });

    state.notes.unshift(payload.note);
    state.selectedId = payload.note.id;
    state.saveStatus = "Saved";
    renderAll();
    elements.noteTitle.focus();
    elements.noteTitle.select();
  } catch (error) {
    window.alert(error.message);
  }
}

async function duplicateSelectedNote() {
  const note = getSelectedNote();
  if (!note) {
    return;
  }

  await createNote({
    title: `${note.title} copy`,
    project: note.project,
    language: note.language,
    tags: note.tags,
    content: note.content,
    pinned: false,
    archived: false
  });
}

async function deleteSelectedNote() {
  const note = getSelectedNote();
  if (!note) {
    return;
  }

  const confirmed = window.confirm(`Delete "${note.title}"?`);
  if (!confirmed) {
    return;
  }

  try {
    await requestJson(`/api/notes/${note.id}`, { method: "DELETE" });
    state.notes = state.notes.filter((entry) => entry.id !== note.id);
    state.selectedId = null;
    state.saveStatus = "Deleted";
    renderAll();
  } catch (error) {
    window.alert(error.message);
  }
}

async function toggleFlag(flagName) {
  const note = getSelectedNote();
  if (!note) {
    return;
  }

  note[flagName] = !note[flagName];
  await saveNote(note.id);
}

function defaultPromptForMode(mode) {
  const prompts = {
    summarize: "Summarize this note and call out the most important points.",
    todos: "Turn this note into an action checklist with concrete next steps.",
    refine: "Rewrite this note to be clearer, tighter and more structured for future me.",
    chat: "Help me reason through this note and suggest what I should do next."
  };

  return prompts[mode] || prompts.chat;
}

async function runAi() {
  const note = getSelectedNote();
  if (!note) {
    window.alert("Pick a note before running AI.");
    return;
  }

  if (!state.config.aiConfigured) {
    window.alert("AI is not configured yet. Add your NVIDIA key in config.local.json or NVIDIA_API_KEY.");
    return;
  }

  const prompt = elements.aiPrompt.value.trim() || defaultPromptForMode(state.aiMode);
  state.aiBusy = true;
  elements.askAiButton.disabled = true;
  elements.askAiButton.textContent = "Running...";

  try {
    const payload = await requestJson("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        noteId: note.id,
        mode: state.aiMode,
        prompt
      })
    });

    elements.aiResponse.dataset.reply = payload.reply;
    elements.aiRelated.dataset.related = JSON.stringify(payload.relatedNotes || []);
    state.config.model = payload.model || state.config.model;
    renderAiPanel(payload.reply, payload.relatedNotes || []);
  } catch (error) {
    elements.aiResponse.dataset.reply = `AI error: ${error.message}`;
    elements.aiRelated.dataset.related = "[]";
    renderAiPanel(`AI error: ${error.message}`, []);
  } finally {
    state.aiBusy = false;
    elements.askAiButton.disabled = false;
    elements.askAiButton.textContent = "Run AI";
  }
}

function openCommandPalette() {
  state.commandOpen = true;
  state.commandQuery = "";
  renderCommandPalette();
  elements.commandInput.value = "";
  elements.commandInput.focus();
}

function closeCommandPalette() {
  state.commandOpen = false;
  renderCommandPalette();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderAll();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderAll();
  });

  elements.previewToggle.addEventListener("click", () => {
    state.preview = !state.preview;
    renderEditor();
  });

  elements.newNoteButton.addEventListener("click", () => createNote());
  elements.commandButton.addEventListener("click", openCommandPalette);
  elements.closeCommand.addEventListener("click", closeCommandPalette);

  elements.commandInput.addEventListener("input", (event) => {
    state.commandQuery = event.target.value;
    renderCommandPalette();
  });

  elements.viewList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) {
      return;
    }
    state.view = button.dataset.view;
    renderAll();
  });

  elements.projectList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project]");
    if (!button) {
      return;
    }
    state.activeProject = button.dataset.project;
    renderAll();
  });

  elements.tagList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag]");
    if (!button) {
      return;
    }
    state.activeTag = button.dataset.tag;
    renderAll();
  });

  elements.notesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-note-id]");
    if (!button) {
      return;
    }
    state.selectedId = button.dataset.noteId;
    renderAll();
  });

  elements.commandResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-command-note]");
    if (!button) {
      return;
    }
    state.selectedId = button.dataset.commandNote;
    closeCommandPalette();
    renderAll();
  });

  elements.aiRelated.addEventListener("click", (event) => {
    const button = event.target.closest("[data-related-id]");
    if (!button) {
      return;
    }
    state.selectedId = button.dataset.relatedId;
    renderAll();
  });

  elements.noteTitle.addEventListener("input", (event) => {
    updateLocalNote({ title: event.target.value });
    scheduleSave();
  });

  elements.noteProject.addEventListener("input", (event) => {
    updateLocalNote({ project: event.target.value });
    scheduleSave();
  });

  elements.noteLanguage.addEventListener("input", (event) => {
    updateLocalNote({ language: event.target.value });
    scheduleSave();
  });

  elements.noteTags.addEventListener("input", (event) => {
    updateLocalNote({
      tags: event.target.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    });
    scheduleSave();
  });

  elements.noteContent.addEventListener("input", (event) => {
    updateLocalNote({ content: event.target.value });
    scheduleSave();
  });

  elements.pinButton.addEventListener("click", () => toggleFlag("pinned"));
  elements.archiveButton.addEventListener("click", () => toggleFlag("archived"));
  elements.duplicateButton.addEventListener("click", duplicateSelectedNote);
  elements.saveButton.addEventListener("click", () => {
    const note = getSelectedNote();
    if (note) {
      saveNote(note.id);
    }
  });
  elements.deleteButton.addEventListener("click", deleteSelectedNote);
  elements.askAiButton.addEventListener("click", runAi);

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      state.aiMode = button.dataset.mode;
      if (!elements.aiPrompt.value.trim()) {
        elements.aiPrompt.value = defaultPromptForMode(state.aiMode);
      }
      renderAiPanel(elements.aiResponse.dataset.reply || "", JSON.parse(elements.aiRelated.dataset.related || "[]"));
    });
  }

  document.addEventListener("keydown", (event) => {
    const modifier = event.ctrlKey || event.metaKey;

    if (modifier && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
      return;
    }

    if (modifier && event.key.toLowerCase() === "n") {
      event.preventDefault();
      createNote();
      return;
    }

    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      const note = getSelectedNote();
      if (note) {
        saveNote(note.id);
      }
      return;
    }

    if (event.key === "Escape" && state.commandOpen) {
      closeCommandPalette();
    }
  });
}

async function init() {
  try {
    await Promise.all([loadConfig(), loadNotes()]);
    if (!state.selectedId && state.notes[0]) {
      state.selectedId = state.notes[0].id;
    }
    elements.aiPrompt.value = defaultPromptForMode(state.aiMode);
    elements.aiResponse.dataset.reply = "";
    elements.aiRelated.dataset.related = "[]";
    bindEvents();
    renderAll();
  } catch (error) {
    document.body.innerHTML = `<main class="panel" style="margin:24px"><h1>Failed to load ForgePad</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

init();
