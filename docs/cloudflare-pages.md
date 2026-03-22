# Cloudflare Pages deploy

This app does not need React, Vite, Next, or any build step. It is a plain static frontend with Cloudflare Pages Functions.

## What to choose in Cloudflare Pages

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: repository root

Cloudflare Pages will automatically detect and deploy the `functions/` directory as Pages Functions.

## Storage setup

Create a KV namespace first.

Suggested name:

- `forgepad-notes`

Then bind it to your Pages project as:

- Binding name: `NOTES_KV`

## Secrets and variables to add

Add these in the Cloudflare Pages project settings for both Preview and Production if you want both environments to work:

- Secret: `APP_PASSWORD`
  Use a strong password. The app prompts for it before loading notes.
- Secret: `NVIDIA_API_KEY`
  Your NVIDIA Builder API key.
- Variable: `NVIDIA_MODEL`
  Optional. Default is `qwen/qwen3-coder-480b-a35b-instruct`.

## Deploy flow

1. Push this repo to GitHub.
2. In Cloudflare Pages, create a new project from the Git repo.
3. Pick `None` as the framework preset.
4. Set build output directory to `public`.
   Set build command to `exit 0`.
5. Add the `NOTES_KV` binding.
6. Add `APP_PASSWORD` and `NVIDIA_API_KEY`.
7. Deploy.

## Optional local dev

If you want to run the Pages Functions locally with bindings, Cloudflare documents local KV access through Wrangler. The typical shape is:

```bash
npx wrangler pages dev public --kv=NOTES_KV
```

## What this means operationally

- Your notes are stored in Cloudflare KV, not in the browser.
- The NVIDIA API key stays in Cloudflare secrets, not in frontend code.
- You can open the app from any device as long as you know the app password.

## Recommended hardening

- Keep the Pages project unlisted if possible.
- Use a strong `APP_PASSWORD`.
- If you want stricter protection later, add Cloudflare Access in front of the Pages app.
