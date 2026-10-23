/**
 * Cloudflare Worker for the Multimedia Club site.
 * POST /api/tts proxies Fish Audio. Every other path is a static file.
 * The browser never sees TTS_API_KEY.
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

async function handleTts(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  const apiKey = env.TTS_API_KEY;
  if (!apiKey) return json(503, { error: "Voice service is not configured" });

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
  const model = (env.TTS_MODEL && env.TTS_MODEL !== referenceId) ? env.TTS_MODEL : DEFAULT_MODEL;
  const requestBody = {
    text,
    format: "mp3",
    mp3_bitrate: 128,
    latency: "normal",
    chunk_length: 200,
    reference_id: referenceId,
  };

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
      return json(mapProviderStatus(providerRes.status), { error: safeProviderMessage(providerRes.status), detail: String(detail).slice(0, 180) });
    }
    return new Response(await providerRes.arrayBuffer(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": providerRes.headers.get("content-type") || "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.warn("Verity TTS proxy error:", error && error.message);
    return json(502, { error: "Voice service unavailable" });
  }
}

async function handleChat(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const apiKey = env.CHAT_API_KEY;
  if (!apiKey) return json(503, { error: "Chat not configured" });
  let payload;
  try { payload = await request.json(); } catch (e) { return json(400, { error: "Invalid JSON" }); }
  const endpoint = env.CHAT_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = env.CHAT_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.8, messages: payload.messages || [] })
    });
    if (!res.ok) return json(502, { error: "Chat provider failed" });
    const data = await res.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return json(200, { reply: reply || "" });
  } catch (error) {
    return json(502, { error: "Chat service unavailable" });
  }
}


async function handleMemberChat(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!env.DB) return json(503, { error: "D1 database is not bound" });
  if (request.method === "GET") {
    const rows = await env.DB.prepare("SELECT * FROM member_messages ORDER BY id DESC LIMIT 80").all();
    return json(200, { messages: (rows.results || []).reverse().map(function (row) { return { id: row.id, user: row.username, role: row.role, text: row.text, time: row.created_at }; }) });
  }
  const body = await request.json();
  if (body.action === "delete") await env.DB.prepare("DELETE FROM member_messages WHERE id = ?").bind(body.id).run();
  else if (body.action === "edit") await env.DB.prepare("UPDATE member_messages SET text = ? WHERE id = ?").bind(String(body.text || "").slice(0, 500), body.id).run();
  else if (body.text) await env.DB.prepare("INSERT INTO member_messages (username, role, text, created_at) VALUES (?, ?, ?, ?)").bind(body.user || "Member", body.role || "Member", String(body.text).slice(0, 500), new Date().toISOString()).run();
  return json(200, { ok: true });
}
async function handleSubscribe(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!env.DB) return json(503, { error: "D1 database is not bound" });
  const sub = await request.json();
  if (!sub || !sub.endpoint) return json(400, { error: "Missing subscription" });
  const id = bytesToB64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub.endpoint))));
  await env.DB.prepare("INSERT OR REPLACE INTO push_subs (id, endpoint, subscription) VALUES (?, ?, ?)").bind(id, sub.endpoint, JSON.stringify(sub)).run();
  return json(200, { ok: true });
}
async function handleNotify(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const body = await request.json().catch(function () { return {}; });
  const alert = { title: body.title || "Multimedia", body: body.body || "New club update" };
  if (env.DB) await env.DB.prepare("INSERT INTO alerts (title, body, created_at, link, category) VALUES (?, ?, ?, ?, ?)").bind(alert.title, alert.body, new Date().toISOString(), body.link || "/", body.category || "general").run();
  let sent = 0;
  if (env.DB && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_JWK) {
    const rows = await env.DB.prepare("SELECT subscription FROM push_subs").all();
    for (const row of rows.results || []) {
      try { await sendWebPush(JSON.parse(row.subscription), env); sent += 1; } catch (e) {}
    }
  }
  return json(200, { sent: sent, title: alert.title, body: alert.body });
}
async function handleLatestAlert(request, env) {
  if (!env.DB) return json(200, { title: "Multimedia Club", body: "New club update." });
  const row = await env.DB.prepare("SELECT title, body FROM alerts ORDER BY id DESC LIMIT 1").first();
  return json(200, row || { title: "Multimedia Club", body: "New club update." });
}
async function sendWebPush(subscription, env) {
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: "60",
      Authorization: "vapid t=" + await vapidJwt(subscription.endpoint, env) + ", k=" + env.VAPID_PUBLIC_KEY
    }
  });
  if (!res.ok) throw new Error("Push failed " + res.status);
}
function b64urlToBytes(value) {
  const pad = "=".repeat((4 - value.length % 4) % 4);
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
}
function bytesToB64url(bytes) {
  let s = "";
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function vapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(new TextEncoder().encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: "mailto:club@multimedia.local" })));
  const data = new TextEncoder().encode(header + "." + claims);
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data));
  return header + "." + claims + "." + bytesToB64url(sig);
}

async function signSession(payload, secret) {
  const body = bytesToB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = bytesToB64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))));
  return body + "." + sig;
}
async function readSession(request, env) {
  if (!env.SESSION_SECRET) return { role: "Member", username: "local" };
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "");
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[1]), new TextEncoder().encode(parts[0]));
  if (!ok) return null;
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
}
function canWrite(session) {
  return session && ["Member", "Editor", "Photographer", "Developer", "Admin"].includes(session.role);
}
async function handleSession(request, env) {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const body = await request.json();
  if (!body.username || !body.role) return json(400, { error: "Missing account" });
  if (!env.SESSION_SECRET) return json(200, { token: "" });
  const token = await signSession({ username: String(body.username).slice(0, 80), role: String(body.role), exp: Date.now() + 1000 * 60 * 60 * 12 }, env.SESSION_SECRET);
  return json(200, { token });
}
async function handleLive(request, env) {
  if (!env.DB) return json(503, { error: "D1 database is not bound" });
  const events = await env.DB.prepare("SELECT * FROM events ORDER BY date ASC").all();
  const announcements = await env.DB.prepare("SELECT * FROM announcements ORDER BY posted_at DESC").all();
  return json(200, {
    events: (events.results || []).map(function (row) { return { id: Number(row.id) || row.id, name: row.name, date: row.date, description: row.description, image: row.image, location: row.location, posterColor: row.poster_color }; }),
    announcements: (announcements.results || []).map(function (row) { return { id: Number(row.id) || row.id, title: row.title, content: row.content, image: row.image, category: row.category, date: row.date, postedAt: row.posted_at, pinned: !!row.pinned, author: row.author }; })
  });
}
async function handleSaveEvent(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!env.DB) return json(503, { error: "D1 database is not bound" });
  if (request.method === "DELETE") {
    const session = await readSession(request, env);
    if (!canWrite(session)) return json(401, { error: "Sign in required" });
    const id = new URL(request.url).searchParams.get("id");
    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
    return json(200, { ok: true });
  }
  const session = await readSession(request, env);
  if (!canWrite(session)) return json(401, { error: "Sign in required" });
  const item = await request.json();
  if (!item.name || !item.date) return json(400, { error: "Missing event fields" });
  await env.DB.prepare("INSERT OR REPLACE INTO events (id, name, date, description, image, location, poster_color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM events WHERE id = ?), ?))").bind(String(item.id || Date.now()), String(item.name).slice(0, 160), item.date, String(item.description || "").slice(0, 2000), item.image || "", item.location || "Campus", item.posterColor || "#FFD700", String(item.id || Date.now()), new Date().toISOString()).run();
  return json(200, { ok: true });
}
async function handleSaveAnnouncement(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!env.DB) return json(503, { error: "D1 database is not bound" });
  if (request.method === "DELETE") {
    const session = await readSession(request, env);
    if (!canWrite(session)) return json(401, { error: "Sign in required" });
    const id = new URL(request.url).searchParams.get("id");
    await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
    return json(200, { ok: true });
  }
  const session = await readSession(request, env);
  if (!canWrite(session)) return json(401, { error: "Sign in required" });
  const item = await request.json();
  if (!item.title) return json(400, { error: "Missing announcement title" });
  const now = item.postedAt || new Date().toISOString();
  await env.DB.prepare("INSERT OR REPLACE INTO announcements (id, title, content, image, category, date, posted_at, pinned, author, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(String(item.id || Date.now()), String(item.title).slice(0, 160), String(item.content || "").slice(0, 4000), item.image || "", item.category || "General", item.date || now, now, item.pinned ? 1 : 0, item.author || session.username || "", now).run();
  return json(200, { ok: true });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/tts") return handleTts(request, env);
    if (url.pathname === "/api/chat") return handleChat(request, env);
    if (url.pathname === "/api/session") return handleSession(request, env);
    if (url.pathname === "/api/live") return handleLive(request, env);
    if (url.pathname === "/api/events") return handleSaveEvent(request, env);
    if (url.pathname === "/api/announcements") return handleSaveAnnouncement(request, env);
    if (url.pathname === "/api/notify") return handleNotify(request, env);
    if (url.pathname === "/api/member-chat") return handleMemberChat(request, env);
    if (url.pathname === "/api/latest-alert") return handleLatestAlert(request, env);
    if (url.pathname === "/api/push-key") return json(200, { publicKey: env.VAPID_PUBLIC_KEY || "" });
    if (url.pathname.startsWith("/api/")) return json(request.method === "GET" ? 200 : 404, { error: "Unknown API route" });
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return json(404, { error: "Not found" });
  },
};
