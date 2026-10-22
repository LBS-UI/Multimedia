const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  const apiKey = Deno.env.get("FISH_API_KEY");
  if (!apiKey) return json(503, { error: "Voice is not configured" });
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json(400, { error: "Missing text" });
  const referenceId = Deno.env.get("FISH_VOICE_ID") || "8d21b053e2804e2a890e1cf62f267b6f";
  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      model: "s2.1-pro-free"
    },
    body: JSON.stringify({
      text: text.slice(0, 1200),
      format: "mp3",
      mp3_bitrate: 128,
      latency: "low",
      reference_id: referenceId
    })
  });
  if (!res.ok) return json(502, { error: "Voice provider failed" });
  return new Response(await res.arrayBuffer(), { status: 200, headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
});

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
