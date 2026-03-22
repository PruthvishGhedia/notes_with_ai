export const seedNotes = [
  {
    id: "seed-architecture",
    title: "Notes app architecture",
    project: "ForgePad",
    language: "markdown",
    tags: ["architecture", "backend", "ideas"],
    pinned: true,
    archived: false,
    content:
      "# ForgePad\n\nA note system should feel like a workspace, not a pile of scratch files.\n\n## Core requirements\n- Full-text search across title, body, project and tags\n- Pinned notes for active work\n- Archived notes that stay searchable\n- Markdown support for structured thinking\n- AI assistant that can summarize, extract actions and answer questions about the current note\n\n```ts\ninterface Note {\n  id: string;\n  title: string;\n  project: string;\n  tags: string[];\n  content: string;\n}\n```",
    createdAt: "2026-03-21T09:15:00.000Z",
    updatedAt: "2026-03-22T06:30:00.000Z"
  },
  {
    id: "seed-bugs",
    title: "Open issues to revisit",
    project: "Personal",
    language: "text",
    tags: ["todo", "bugs"],
    pinned: false,
    archived: false,
    content:
      "- Fix duplicate note title edge case\n- Add import/export later\n- Add note backlinks if search UX needs it\n- Track quick snippets separately from long-form notes",
    createdAt: "2026-03-20T11:40:00.000Z",
    updatedAt: "2026-03-22T05:00:00.000Z"
  },
  {
    id: "seed-snippets",
    title: "CLI snippets",
    project: "Toolbox",
    language: "bash",
    tags: ["snippets", "cli"],
    pinned: false,
    archived: true,
    content:
      "```bash\nnpx wrangler pages deploy public\ncurl -X POST /api/ai/chat -H \"Content-Type: application/json\"\n```",
    createdAt: "2026-03-18T18:10:00.000Z",
    updatedAt: "2026-03-19T07:45:00.000Z"
  }
];

