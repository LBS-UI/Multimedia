/**
 * Verity TTS proxy — Fish Audio
 * -----------------------------
 * The browser never sees TTS_API_KEY.
 * speakVerity() posts { text, voiceId? } to /api/tts.
 * This Netlify function reads secrets from environment variables
 * and calls Fish Audio's official HTTP TTS API.
 *
 * Official API (docs.fish.audio):
 *   POST https://api.fish.audio/v1/tts
 *   Authorization: Bearer <api key>
 *   Content-Type: application/json
 *   model: <engine name header>
 *   Body: { text, reference_id, format }
 *
 * Env:
 *   TTS_API_KEY        required — Fish Audio API key
 *   TTS_REFERENCE_ID   Fish Audio voice model / reference ID
 *   TTS_VOICE_ID       alias for TTS_REFERENCE_ID
 *   TTS_API_URL        optional full TTS URL
 *   TTS_MODEL          optional engine header (s1, s2-pro, s2.1-pro, s2.1-pro-free, drama-3-preview)
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.TTS_API_KEY;
  if (!apiKey) {
    return json(503, { error: "Voice service is not configured" });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "Invalid JSON body" });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    return json(400, { error: "Missing text" });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return json(400, { error: "Text is too long" });
  }

  // Fish Audio official field name is reference_id (voice model ID).
  const referenceId =
    (typeof payload.referenceId === "string" && payload.referenceId.trim()) ||
    (typeof payload.voiceId === "string" && payload.voiceId.trim()) ||
    process.env.TTS_REFERENCE_ID ||
    process.env.TTS_VOICE_ID ||
    DEFAULT_REFERENCE_ID;

  const endpoint = (process.env.TTS_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  const model = process.env.TTS_MODEL || DEFAULT_MODEL;

  const requestBody = {
    text,
    format: "mp3",
    mp3_bitrate: 128,
    latency: "low",
    chunk_length: 100,
  };

  if (referenceId) {
    requestBody.reference_id = referenceId;
  }

  try {
    const providerRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        model: model,
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

    const audioBuffer = Buffer.from(await providerRes.arrayBuffer());
    const contentType = providerRes.headers.get("content-type") || "audio/mpeg";

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
      body: audioBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.warn("Verity TTS proxy error:", error && error.message);
    return json(502, { error: "Voice service unavailable" });
  }
};
