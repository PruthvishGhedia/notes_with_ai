# ForgePad

ForgePad is a local, developer-oriented notes app built for fast retrieval, cleaner structure, and AI help without pushing your notes into a browser-only toy setup.

## What it does

* Full-text search across title, content, tags, language and project
* Smart views for pinned, recent and archived notes
* Metadata fields that make notes easier to organize later
* Markdown editing with a live preview mode
* Quick-jump palette with `Ctrl+K`
* Local JSON-backed note storage in `data/notes.json`
* NVIDIA Builder integration through a server-side proxy so your browser never sees the API key

## Run it

From `D:\\Projects\\NOTES\_APP`:

```powershell
node server.js
```

Then open [http://localhost:3210](http://localhost:3210).

## NVIDIA setup

Do not paste your key into the frontend.

Use either:

1. A local config file

Copy `config.example.json` to `config.local.json`, then fill in your key.

2. An environment variable

```powershell
$env:NVIDIA\_API\_KEY="your-key-here"
node server.js
```

Optional model override:

```powershell
$env:NVIDIA\_MODEL="qwen/qwen3-coder-480b-a35b-instruct"
node server.js
```

The app uses NVIDIA's OpenAI-compatible chat completions endpoint:

`https://integrate.api.nvidia.com/v1/chat/completions`

## Files

* `server.js`: static server, notes API and NVIDIA proxy
* `public/index.html`: app shell
* `public/styles.css`: UI styling
* `public/app.js`: client logic
* `data/seed-notes.json`: starter notes copied on first launch
* `data/notes.json`: live local note storage, generated automatically

## Notes

* `config.local.json` is ignored by `.gitignore`
* `data/notes.json` is also ignored so your personal notes do not get committed by mistake
* Restart the server after changing the NVIDIA config

