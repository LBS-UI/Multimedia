const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(statusCode, body) {
  return { statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const apiKey = process.env.OPENAI_API_KEY || process.env.CHAT_API_KEY;
  if (!apiKey) return json(503, { error: "Chat is not configured" });
  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Invalid JSON" }); }
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!messages.length) return json(400, { error: "Missing messages" });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.8, messages })
  });
  if (!res.ok) return json(502, { error: "Chat provider failed" });
  const data = await res.json();
  return json(200, { reply: data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "" });
};
