/**
 * Verity TTS proxy — Fish Audio on Cloudflare Pages Functions
 * ----------------------------------------------------------
 * Route: POST /api/tts
 * The browser never sees TTS_API_KEY.
 * speakVerity() posts { text, voiceId? } and expects audio bytes.
 *
 * Fish Audio:
 *   POST https://api.fish.audio/v1/tts
 *   Authorization: Bearer <api key>
 *   model: <engine header>
 *   Body: { text, reference_id, format }
 *
 * Secrets (Cloudflare Pages → Settings → Environment variables):
 *   TTS_API_KEY        required
 *   TTS_REFERENCE_ID   voice model / reference ID
 *   TTS_VOICE_ID       alias for TTS_REFERENCE_ID
 *   TTS_API_URL        optional
 *   TTS_MODEL          optional engine header
 */

const DEFAULT_API_URL = "https://api.fish.audio/v1/tts";
const DEFAULT_MODEL = "s2.1-pro-free";
const DEFAULT_REFERENCE_ID = "8d21b053e2804e2a890e1cf62f267b6f";
const MAX_TEXT_LENGTH = 1200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapProviderStatus(status) {
  if (status === 401 || status === 403) return 401;
  if (status === 400 || status === 404 || status === 422) return 400;
  if (status === 429) return 429;
  if (status >= 500) return 502;
  return 502;
}

function safeProviderMessage(status) {
  if (status === 401 || status === 403) return "Voice authentication failed";
  if (status === 404) return "Voice or model ID was not found";
  if (status === 400 || status === 422) return "Voice request was invalid";
  if (status === 429) return "Voice service rate limit reached";
  return "Voice provider request failed";
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = env.TTS_API_KEY;
  if (!apiKey) {
    return json(503, { error: "Voice service is not configured" });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    return json(400, { error: "Invalid JSON body" });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return json(400, { error: "Missing text" });
  if (text.length > MAX_TEXT_LENGTH) return json(400, { error: "Text is too long" });

  const referenceId =
    (typeof payload.referenceId === "string" && payload.referenceId.trim()) ||
    (typeof payload.voiceId === "string" && payload.voiceId.trim()) ||
    env.TTS_REFERENCE_ID ||
    env.TTS_VOICE_ID ||
    DEFAULT_REFERENCE_ID;

  const endpoint = (env.TTS_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  const model = env.TTS_MODEL || DEFAULT_MODEL;
  const requestBody = {
    text,
    format: "mp3",
    mp3_bitrate: 128,
    latency: "low",
    chunk_length: 100,
  };
  if (referenceId) requestBody.reference_id = referenceId;

  try {
    const providerRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        model,
      },
      body: JSON.stringify(requestBody),
    });

    if (!providerRes.ok) {
      const detail = await providerRes.text();
      console.warn("Verity TTS provider error:", providerRes.status, String(detail).slice(0, 200));
      return json(mapProviderStatus(providerRes.status), {
        error: safeProviderMessage(providerRes.status),
      });
    }

    const audio = await providerRes.arrayBuffer();
    const contentType = providerRes.headers.get("content-type") || "audio/mpeg";
    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.warn("Verity TTS proxy error:", error && error.message);
    return json(502, { error: "Voice service unavailable" });
  }
}
