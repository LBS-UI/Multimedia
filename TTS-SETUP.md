# Verity voice setup (Fish Audio)

Verity’s spoken responses go through a secure Netlify Function. The Fish Audio API key is never placed in HTML, CSS, or frontend JavaScript.

Official Fish Audio TTS API used by this project:

```
POST https://api.fish.audio/v1/tts
Authorization: Bearer <TTS_API_KEY>
Content-Type: application/json
model: <TTS_MODEL>
```

```json
{
  "text": "Hello from Verity.",
  "reference_id": "<TTS_REFERENCE_ID>",
  "format": "mp3"
}
```

Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech

## Environment variables (Netlify)

Site settings → Environment variables → add these → Redeploy.

```
TTS_API_KEY=
TTS_REFERENCE_ID=
TTS_VOICE_ID=
TTS_API_URL=
TTS_MODEL=
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `TTS_API_KEY` | Yes | Fish Audio API key. Read only on the server as `process.env.TTS_API_KEY`. |
| `TTS_REFERENCE_ID` | Recommended | Fish Audio voice model ID (`reference_id`). |
| `TTS_VOICE_ID` | Optional alias | Same value as `TTS_REFERENCE_ID`. Either name works. |
| `TTS_API_URL` | No | Full TTS URL. Default: `https://api.fish.audio/v1/tts` |
| `TTS_MODEL` | No | Engine header. Official values: `s1`, `s2-pro`, `s2.1-pro`, `s2.1-pro-free`, `drama-3-preview`. Default: `s2.1-pro-free` |

Do not put real keys in this file or in `index.html`.

## Where to get Fish Audio values

API key:

1. Create an account at https://fish.audio
2. Open https://fish.audio/app/api-keys/
3. Create a key and store it in Netlify as `TTS_API_KEY`

Voice / reference ID:

1. Open the Fish Audio Voice Library or one of your cloned voices
2. Copy the voice model ID (this is `reference_id`)
3. Store it in Netlify as `TTS_REFERENCE_ID` (or `TTS_VOICE_ID`)

Example public voice ID format from Fish Audio docs looks like a hex string, for example from a library URL such as `https://fish.audio/m/<id>`. Use your own chosen ID. Do not invent one.

## Frontend contract (unchanged)

`POST /api/tts`

```json
{
  "text": "Hello from Verity.",
  "voiceId": "optional-override"
}
```

`netlify.toml` already rewrites `/api/tts` to `/.netlify/functions/tts`.

The function returns audio bytes. `speakVerity()` plays them only when Voice is ON.

## Local testing without a key

Chat still works. Verity stays on `images/idle.jpg`, and the console logs:

`Verity voice unavailable: ...`
