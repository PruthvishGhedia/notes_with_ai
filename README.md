# ForgePad

ForgePad is a developer-first notes app designed for Cloudflare Pages. It gives you a searchable writing workspace, collapsible side panels, a custom right-click menu, aggressive browser shortcut handling, and an NVIDIA-backed AI copilot.

## Stack

- Frontend: plain HTML, CSS and browser JavaScript
- Hosting: Cloudflare Pages
- Backend: Cloudflare Pages Functions
- Storage: Cloudflare KV
- AI: NVIDIA Builder via `https://integrate.api.nvidia.com/v1/chat/completions`

## Features

- Full-text search across title, body, tags, language and project
- Pinned, recent and archived smart views
- Collapsible workspace sidebar, note stack and AI panel
- Markdown editing with preview
- Quick jump palette with `Ctrl+K`
- Shortcut interception for `Ctrl+\``, `Ctrl+S`, `Ctrl+B`, `Ctrl+.`
- Custom right-click menu
- Personal-use password gate via `APP_PASSWORD`

## Cloudflare deploy

Cloudflare-specific setup is documented in [docs/cloudflare-pages.md](D:/Projects/NOTES_APP/docs/cloudflare-pages.md).

## Important bindings and secrets

- `NOTES_KV`: KV namespace binding used to persist notes
- `APP_PASSWORD`: required secret for private access
- `NVIDIA_API_KEY`: required secret for AI
- `NVIDIA_MODEL`: optional environment variable, defaults to `qwen/qwen3-coder-480b-a35b-instruct`

## Repo layout

- `public/`: static app assets and Pages headers
- `functions/`: Cloudflare Pages Functions API routes
- `data/seed-notes.json`: reference seed data
- `.gitignore`: excludes local secrets and generated note files
