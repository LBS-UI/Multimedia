# Multi Media Club portal (Verity upgrade)

This is the existing club website with Solis upgraded to **Verity**, a circular talking orb, and optional voice through a secure `/api/tts` proxy that calls **Fish Audio**.

## Local preview

Open `index.html` in a browser. Chat and the rest of the site work without a backend. Voice needs the TTS function and environment variables described in `TTS-SETUP.md`.

## Official Verity images

Place these files in `images/`:

- `images/idle.jpg` — not speaking
- `images/talking.jpg` — speaking

Temporary portraits are included so the orb is not empty. Replace them with your official character art if you already have it.

## Keep your other assets

Copy these from your original project if you have them:

- `images/class-photo.jpg`
- `images/developer.jpg`
- any other existing media

## Deploy on Netlify

1. Publish the site root (this folder).
2. Add environment variables from `.env.example`.
3. Redeploy so `netlify/functions/tts.js` can read them.
