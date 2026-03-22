const STORAGE_KEYS = {
  authToken: "forgepad.authToken",
  sidebarCollapsed: "forgepad.sidebarCollapsed",
  stackCollapsed: "forgepad.stackCollapsed",
  aiCollapsed: "forgepad.aiCollapsed",
  autoSave: "forgepad.autoSave"
};

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
  autoSave: localStorage.getItem(STORAGE_KEYS.autoSave) === "true",
  authToken: localStorage.getItem(STORAGE_KEYS.authToken) || "",
  appProtected: false,
  authenticated: false,
  contextMenuOpen: false,
  config: {
    aiConfigured: false,
    model: "",
    provider: "",
    storage: ""
  },
  layout: {
    sidebarCollapsed: localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true",
    stackCollapsed: localStorage.getItem(STORAGE_KEYS.stackCollapsed) === "true",
    aiCollapsed: localStorage.getItem(STORAGE_KEYS.aiCollapsed) === "true"
  }
};

const elements = {
  body: document.body,
  authOverlay: document.querySelector("#auth-overlay"),
  authForm: document.querySelector("#auth-form"),
  authPassword: document.querySelector("#auth-password"),
  authRemember: document.querySelector("#auth-remember"),
  authError: document.querySelector("#auth-error"),
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
  downloadTxtButton: document.querySelector("#download-txt-button"),
  downloadMdButton: document.querySelector("#download-md-button"),
  autosaveToggle: document.querySelector("#autosave-toggle"),
  saveButton: document.querySelector("#save-button"),
  deleteButton: document.querySelector("#delete-button"),
  newNoteButton: document.querySelector("#new-note-button"),
  commandButton: document.querySelector("#command-button"),
  commandPalette: document.querySelector("#command-palette"),
  commandInput: document.querySelector("#command-input"),
  commandResults: document.querySelector("#command-results"),
  closeCommand: document.querySelector("#close-command"),
  aiBadge: document.querySelector("#ai-badge"),
  aiNoteSelect: document.querySelector("#ai-note-select"),
  aiPrompt: document.querySelector("#ai-prompt"),
  askAiButton: document.querySelector("#ask-ai-button"),
  aiResponse: document.querySelector("#ai-response"),
  aiRelated: document.querySelector("#ai-related"),
  aiModel: document.querySelector("#ai-model"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
  toggleSidebarButton: document.querySelector("#toggle-sidebar-button"),
  toggleStackButton: document.querySelector("#toggle-stack-button"),
  toggleAiButton: document.querySelector("#toggle-ai-button"),
  collapseStackInline: document.querySelector("#collapse-stack-inline"),
  collapseAiInline: document.querySelector("#collapse-ai-inline"),
  contextMenu: document.querySelector("#context-menu"),
  modalOverlay: document.querySelector("#modal-overlay"),
  modalEyebrow: document.querySelector("#modal-eyebrow"),
  modalTitle: document.querySelector("#modal-title"),
  modalMessage: document.querySelector("#modal-message"),
  modalCancel: document.querySelector("#modal-cancel"),
  modalConfirm: document.querySelector("#modal-confirm")
};

const smartViews = [
  { key: "all", label: "All notes" },
  { key: "pinned", label: "Pinned" },
  { key: "recent", label: "Recent" },
  { key: "archived", label: "Archived" }
];

let activeModalResolver = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function persistLayoutState() {
  localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(state.layout.sidebarCollapsed));
  localStorage.setItem(STORAGE_KEYS.stackCollapsed, String(state.layout.stackCollapsed));
  localStorage.setItem(STORAGE_KEYS.aiCollapsed, String(state.layout.aiCollapsed));
}

function applyLayout() {
  const sidebarChevron = elements.toggleSidebarButton.querySelector(".icon-chevron");
  elements.body.classList.toggle("sidebar-collapsed", state.layout.sidebarCollapsed);
  elements.body.classList.toggle("stack-collapsed", state.layout.stackCollapsed);
  elements.body.classList.toggle("ai-collapsed", state.layout.aiCollapsed);
  elements.toggleStackButton.classList.toggle("active", !state.layout.stackCollapsed);
  elements.toggleAiButton.classList.toggle("active", !state.layout.aiCollapsed);
  elements.toggleStackButton.setAttribute("aria-pressed", String(!state.layout.stackCollapsed));
  elements.toggleAiButton.setAttribute("aria-pressed", String(!state.layout.aiCollapsed));
  sidebarChevron.classList.toggle("icon-chevron-left", !state.layout.sidebarCollapsed);
  sidebarChevron.classList.toggle("icon-chevron-right", state.layout.sidebarCollapsed);
  elements.toggleSidebarButton.setAttribute(
    "aria-label",
    state.layout.sidebarCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"
  );
  elements.toggleSidebarButton.setAttribute(
    "title",
    state.layout.sidebarCollapsed ? "Expand workspace sidebar" : "Collapse workspace sidebar"
  );
  elements.collapseStackInline.setAttribute(
    "aria-label",
    state.layout.stackCollapsed ? "Show note stack" : "Hide note stack"
  );
  elements.collapseStackInline.setAttribute(
    "title",
    state.layout.stackCollapsed ? "Show note stack" : "Hide note stack"
  );
  elements.collapseAiInline.setAttribute(
    "aria-label",
    state.layout.aiCollapsed ? "Show AI panel" : "Hide AI panel"
  );
  elements.collapseAiInline.setAttribute(
    "title",
    state.layout.aiCollapsed ? "Show AI panel" : "Hide AI panel"
  );
  persistLayoutState();
}

function authHeaders() {
  return state.authToken ? { "x-app-password": state.authToken } : {};
}

function showAuthOverlay(message = "") {
  elements.authOverlay.classList.remove("hidden");
  elements.authError.textContent = message;
  elements.authPassword.focus();
}

function hideAuthOverlay() {
  elements.authOverlay.classList.add("hidden");
  elements.authError.textContent = "";
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

function markdownToHtml(source) {
  const escaped = escapeHtml(source);
  const fenced = escaped.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const label = language ? `<div class="meta-copy">${language}</div>` : "";
    return `${label}<pre><code>${code.trim()}</code></pre>`;
  });

  return (
    fenced
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
      .join("") || `<p class="placeholder-copy">Nothing to preview yet.</p>`
  );
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
        <button class="view-button ${state.view === view.key ? "active" : ""}" data-view="${view.key}" type="button">
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
    `<button class="filter-button ${state.activeProject === "all" ? "active" : ""}" data-project="all" type="button">All projects</button>`,
    ...projects.map(
      (project) =>
        `<button class="filter-button ${state.activeProject === project ? "active" : ""}" data-project="${escapeHtml(project)}" type="button">${escapeHtml(project)}</button>`
    )
  ].join("");
}

function renderTags() {
  const tags = [...new Set(state.notes.flatMap((note) => note.tags))].sort();
  elements.tagCount.textContent = String(tags.length);
  elements.tagList.innerHTML = [
    `<button class="tag-chip ${state.activeTag === "all" ? "active" : ""}" data-tag="all" type="button">All tags</button>`,
    ...tags.map(
      (tag) =>
        `<button class="tag-chip ${state.activeTag === tag ? "active" : ""}" data-tag="${escapeHtml(tag)}" type="button">#${escapeHtml(tag)}</button>`
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
        <button class="note-card ${note.id === state.selectedId ? "active" : ""}" data-note-id="${note.id}" type="button">
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

  elements.autosaveToggle.textContent = state.autoSave ? "Autosave On" : "Autosave Off";
  elements.autosaveToggle.setAttribute("aria-pressed", state.autoSave ? "true" : "false");

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
            <button class="command-result" data-command-note="${note.id}" type="button">
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
  const currentAiTarget = state.notes.some((note) => note.id === elements.aiNoteSelect.value)
    ? elements.aiNoteSelect.value
    : state.selectedId;

  elements.aiNoteSelect.innerHTML = state.notes
    .filter((note) => !note.archived)
    .map(
      (note) =>
        `<option value="${note.id}" ${note.id === currentAiTarget ? "selected" : ""}>${escapeHtml(note.title)}${note.project ? ` · ${escapeHtml(note.project)}` : ""}</option>`
    )
    .join("");

  elements.aiBadge.textContent = state.config.aiConfigured ? "AI ready" : "AI disabled";
  elements.aiModel.textContent = state.config.model || "";
  elements.aiResponse.innerHTML = reply
    ? markdownToHtml(reply)
    : `<p class="placeholder-copy">Pick a note and run a summary, refinement, or question against it.</p>`;
  elements.aiRelated.innerHTML = relatedNotes.length
    ? relatedNotes
        .map(
          (note) => `
            <button class="note-card" data-related-id="${note.id}" type="button">
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
  applyLayout();
  renderSmartViews();
  renderProjects();
  renderTags();
  renderNotesList();
  renderEditor();
  renderCommandPalette();
  renderAiPanel(elements.aiResponse.dataset.reply || "", JSON.parse(elements.aiRelated.dataset.related || "[]"));
}

function hideContextMenu() {
  state.contextMenuOpen = false;
  elements.contextMenu.classList.add("hidden");
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function buildExportFilename(note, extension) {
  const title = sanitizeFilenamePart(note.title || "untitled-note");
  const project = sanitizeFilenamePart(note.project || "no-project");
  return `${title} - ${project}.${extension}`;
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildTextExport(note) {
  const header = [
    `Title: ${note.title}`,
    `Project: ${note.project || "None"}`,
    `Language: ${note.language || "text"}`,
    `Tags: ${note.tags.join(", ") || "None"}`,
    `Pinned: ${note.pinned ? "Yes" : "No"}`,
    `Archived: ${note.archived ? "Yes" : "No"}`,
    `Created: ${note.createdAt || ""}`,
    `Updated: ${note.updatedAt || ""}`
  ].join("\n");

  return `${header}\n\n---\n\n${note.content || ""}\n`;
}

function cleanMarkdownExport(content) {
  const trimmed = String(content || "").trim();
  const fencedMatch = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function openModal({
  eyebrow = "Notice",
  title = "ForgePad",
  message = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  tone = "default",
  showCancel = true
}) {
  return new Promise((resolve) => {
    activeModalResolver = resolve;
    elements.modalEyebrow.textContent = eyebrow;
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.modalConfirm.textContent = confirmLabel;
    elements.modalCancel.textContent = cancelLabel;
    elements.modalCancel.classList.toggle("hidden", !showCancel);
    elements.modalConfirm.classList.toggle("danger-button", tone === "danger");
    elements.modalConfirm.classList.toggle("primary-button", tone !== "danger");
    elements.modalConfirm.classList.toggle("modal-confirm", true);
    elements.modalOverlay.classList.remove("hidden");
    elements.modalConfirm.focus();
  });
}

function closeModal(result) {
  elements.modalOverlay.classList.add("hidden");
  if (activeModalResolver) {
    activeModalResolver(result);
    activeModalResolver = null;
  }
}

function alertModal(message, title = "ForgePad", eyebrow = "Notice") {
  return openModal({
    eyebrow,
    title,
    message,
    confirmLabel: "OK",
    showCancel: false
  });
}

function confirmModal(message, title = "Confirm", eyebrow = "Action") {
  return openModal({
    eyebrow,
    title,
    message,
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "danger",
    showCancel: true
  });
}

function openContextMenu(x, y) {
  state.contextMenuOpen = true;
  elements.contextMenu.classList.remove("hidden");
  const menuWidth = 220;
  const menuHeight = 280;
  const left = Math.min(x, window.innerWidth - menuWidth - 12);
  const top = Math.min(y, window.innerHeight - menuHeight - 12);
  elements.contextMenu.style.left = `${Math.max(12, left)}px`;
  elements.contextMenu.style.top = `${Math.max(12, top)}px`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();

  if (response.status === 401) {
    state.authenticated = false;
    showAuthOverlay("Wrong password. Try again.");
    throw new Error(payload.details || payload.error || "Unauthorized.");
  }

  if (!response.ok) {
    throw new Error(payload.details || payload.error || "Request failed.");
  }

  return payload;
}

async function loadConfig() {
  const response = await fetch("/api/config", {
    headers: authHeaders()
  });
  const payload = await response.json();
  state.appProtected = payload.appProtected;
  state.authenticated = payload.authenticated;
  state.config = payload;
}

async function loadNotes() {
  const payload = await requestJson("/api/notes");
  state.notes = payload.notes;
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
  if (!note || !state.autoSave) {
    return;
  }

  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(() => saveNote(note.id), 500);
}

function toggleAutoSave() {
  state.autoSave = !state.autoSave;
  localStorage.setItem(STORAGE_KEYS.autoSave, String(state.autoSave));

  if (!state.autoSave) {
    window.clearTimeout(state.saveTimer);
    state.saveStatus = "Autosave off";
  } else {
    state.saveStatus = "Autosave on";
  }

  renderEditor();
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
    await alertModal(error.message, "Save failed", "Editor");
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
    state.layout.stackCollapsed = false;
    renderAll();
    elements.noteTitle.focus();
    elements.noteTitle.select();
  } catch (error) {
    await alertModal(error.message, "Create note failed", "Editor");
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

  const confirmed = await confirmModal(`Delete "${note.title}"?`, "Delete note", "Danger");
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
    await alertModal(error.message, "Delete failed", "Danger");
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

async function runAi(promptOverride) {
  const noteId = elements.aiNoteSelect.value || state.selectedId;
  const note = state.notes.find((entry) => entry.id === noteId) || null;
  if (!note) {
    await alertModal("Pick a note before running AI.", "No note selected", "AI");
    return;
  }

  if (!state.config.aiConfigured) {
    await alertModal("AI is not configured yet. Add NVIDIA_API_KEY in Cloudflare Pages.", "AI unavailable", "AI");
    return;
  }

  const prompt = promptOverride || elements.aiPrompt.value.trim() || defaultPromptForMode(state.aiMode);
  state.aiBusy = true;
  elements.askAiButton.disabled = true;
  elements.askAiButton.textContent = "Running...";

  try {
    const payload = await requestJson("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        noteId,
        mode: state.aiMode,
        prompt
      })
    });

    elements.aiResponse.dataset.reply = payload.reply;
    elements.aiRelated.dataset.related = JSON.stringify(payload.relatedNotes || []);
    state.config.model = payload.model || state.config.model;
    state.layout.aiCollapsed = false;
    renderAiPanel(payload.reply, payload.relatedNotes || []);
    applyLayout();
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

async function exportSelectedNoteAsText() {
  const note = getSelectedNote();
  if (!note) {
    await alertModal("Pick a note before exporting.", "No note selected", "Export");
    return;
  }

  triggerDownload(
    buildExportFilename(note, "txt"),
    buildTextExport(note),
    "text/plain;charset=utf-8"
  );
}

async function exportSelectedNoteAsMarkdown() {
  const note = getSelectedNote();
  if (!note) {
    await alertModal("Pick a note before exporting.", "No note selected", "Export");
    return;
  }

  if (!state.config.aiConfigured) {
    await alertModal(
      "Markdown export uses AI formatting. Add NVIDIA_API_KEY in Cloudflare Pages first.",
      "AI unavailable",
      "Export"
    );
    return;
  }

  elements.downloadMdButton.disabled = true;
  elements.downloadMdButton.textContent = "Formatting...";

  try {
    const payload = await requestJson("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        noteId: note.id,
        mode: "refine",
        prompt:
          "Convert this note into clean markdown only. Preserve meaning, keep all important content, improve headings, bullets, code fences and spacing, and return only markdown with no commentary."
      })
    });

    triggerDownload(
      buildExportFilename(note, "md"),
      cleanMarkdownExport(payload.reply),
      "text/markdown;charset=utf-8"
    );
  } catch (error) {
    await alertModal(error.message, "Markdown export failed", "Export");
  } finally {
    elements.downloadMdButton.disabled = false;
    elements.downloadMdButton.textContent = "Download MD";
  }
}

function openCommandPalette() {
  state.commandOpen = true;
  renderCommandPalette();
  elements.commandInput.value = state.commandQuery;
  elements.commandInput.focus();
}

function closeCommandPalette() {
  state.commandOpen = false;
  renderCommandPalette();
}

function toggleSidebar() {
  state.layout.sidebarCollapsed = !state.layout.sidebarCollapsed;
  applyLayout();
}

function toggleStack() {
  state.layout.stackCollapsed = !state.layout.stackCollapsed;
  applyLayout();
}

function toggleAi() {
  state.layout.aiCollapsed = !state.layout.aiCollapsed;
  applyLayout();
}

function resetLayout() {
  state.layout.sidebarCollapsed = false;
  state.layout.stackCollapsed = false;
  state.layout.aiCollapsed = false;
  applyLayout();
}

function handleShortcut(event) {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier) {
    if (event.key === "Escape") {
      hideContextMenu();
      if (state.commandOpen) {
        closeCommandPalette();
      }
    }
    return;
  }

  const key = event.key.toLowerCase();
  if (["`", "k", "s", "b", "."].includes(key)) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (key === "`") {
    createNote();
    return;
  }

  if (key === "k") {
    openCommandPalette();
    return;
  }

  if (key === "s") {
    const note = getSelectedNote();
    if (note) {
      saveNote(note.id);
    }
    return;
  }

  if (key === "b") {
    toggleSidebar();
    return;
  }

  if (key === ".") {
    toggleAi();
  }
}

async function refreshProtectedData() {
  await loadConfig();

  if (state.appProtected && !state.authenticated) {
    showAuthOverlay();
    return;
  }

  hideAuthOverlay();
  await loadNotes();
  if (!state.selectedId && state.notes[0]) {
    state.selectedId = state.notes[0].id;
  }
  renderAll();
}

function bindEvents() {
  elements.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = elements.authPassword.value.trim();
    state.authToken = password;

    try {
      await refreshProtectedData();
      if (!state.authenticated) {
        throw new Error("Wrong password.");
      }

      if (elements.authRemember.checked) {
        localStorage.setItem(STORAGE_KEYS.authToken, password);
      } else {
        localStorage.removeItem(STORAGE_KEYS.authToken);
      }
      elements.authPassword.value = "";
    } catch (error) {
      showAuthOverlay(error.message);
    }
  });

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
  elements.toggleSidebarButton.addEventListener("click", toggleSidebar);
  elements.toggleStackButton.addEventListener("click", toggleStack);
  elements.toggleAiButton.addEventListener("click", toggleAi);
  elements.collapseStackInline.addEventListener("click", toggleStack);
  elements.collapseAiInline.addEventListener("click", toggleAi);
  elements.autosaveToggle.addEventListener("click", toggleAutoSave);
  elements.aiNoteSelect.addEventListener("change", () => {
    elements.aiPrompt.value = defaultPromptForMode(state.aiMode);
  });
  elements.downloadTxtButton.addEventListener("click", exportSelectedNoteAsText);
  elements.downloadMdButton.addEventListener("click", exportSelectedNoteAsMarkdown);
  elements.modalCancel.addEventListener("click", () => closeModal(false));
  elements.modalConfirm.addEventListener("click", () => closeModal(true));
  elements.modalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modalOverlay) {
      closeModal(false);
    }
  });

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
  elements.askAiButton.addEventListener("click", () => runAi());

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      state.aiMode = button.dataset.mode;
      elements.aiPrompt.value = defaultPromptForMode(state.aiMode);
      renderAiPanel(elements.aiResponse.dataset.reply || "", JSON.parse(elements.aiRelated.dataset.related || "[]"));
    });
  }

  elements.contextMenu.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-context-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.contextAction;
    hideContextMenu();

    if (action === "new-note") {
      await createNote();
    } else if (action === "duplicate-note") {
      await duplicateSelectedNote();
    } else if (action === "download-txt") {
      await exportSelectedNoteAsText();
    } else if (action === "download-md") {
      await exportSelectedNoteAsMarkdown();
    } else if (action === "toggle-pin") {
      await toggleFlag("pinned");
    } else if (action === "toggle-archive") {
      await toggleFlag("archived");
    } else if (action === "toggle-stack") {
      toggleStack();
    } else if (action === "toggle-ai") {
      toggleAi();
    } else if (action === "reset-layout") {
      resetLayout();
    } else if (action === "summarize-note") {
      state.aiMode = "summarize";
      elements.aiPrompt.value = defaultPromptForMode("summarize");
      await runAi(defaultPromptForMode("summarize"));
    }
  });

  window.addEventListener("keydown", handleShortcut, { capture: true });
  window.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY);
    },
    { capture: true }
  );
  window.addEventListener("click", () => hideContextMenu(), { capture: true });
  window.addEventListener("scroll", hideContextMenu, { capture: true });
  window.addEventListener("resize", hideContextMenu);
}

async function init() {
  bindEvents();
  elements.aiPrompt.value = defaultPromptForMode(state.aiMode);
  elements.aiResponse.dataset.reply = "";
  elements.aiRelated.dataset.related = "[]";
  applyLayout();

  try {
    await refreshProtectedData();
  } catch (error) {
    document.body.innerHTML = `<main class="panel"><h1>Failed to load ForgePad</h1><p>${escapeHtml(error.message)}</p></main>`;
  }
}

init();
