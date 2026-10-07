# Verity voice on Cloudflare Pages

The site still calls `POST /api/tts` with `{ "text": "..." }`.
That route is now a Cloudflare Pages Function in `functions/api/tts.js`.
The function calls Fish Audio and returns MP3 bytes. The API key stays in Cloudflare.

## Secrets

In the Pages project: Settings → Environment variables → Production (and Preview if you test preview URLs).

- `TTS_API_KEY` — Fish Audio API key. Mark it as a secret.
- `TTS_REFERENCE_ID` — Fish Audio voice / reference ID.
- `TTS_VOICE_ID` — optional alias for the same ID.
- `TTS_API_URL` — optional. Default is `https://api.fish.audio/v1/tts`.
- `TTS_MODEL` — optional engine header. Default is `s2.1-pro-free`.

Get the key and reference ID from the Fish Audio dashboard. Do not put them in `index.html`.

## Deploy

1. Connect the GitHub repo to Cloudflare Pages.
2. Build command: none.
3. Build output directory: `/` (the folder that contains `index.html` and `functions/`).
4. Add the secrets above, then redeploy.
5. `netlify.toml` and `netlify/functions/tts.js` are not used on Cloudflare and can be removed.

## Test

1. Open the deployed site with Voice ON.
2. Send Verity a message.
3. In the browser network tab, `POST /api/tts` should return `200` and `audio/mpeg`.
4. Turn Voice OFF. No `/api/tts` request should be sent.
