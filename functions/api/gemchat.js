const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + DEFAULT_MODEL + ":generateContent";

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value, max = 12000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function getConfig(env) {
  return {
    key: env.GEMINI_API_KEY || env.SIPDA_UPSTREAM_KEY || "",
    url: env.SIPDA_GEMCHAT_URL || env.SIPDA_UPSTREAM_URL || DEFAULT_URL,
    model: env.SIPDA_MODEL || DEFAULT_MODEL,
    header: env.SIPDA_UPSTREAM_KEY_HEADER || "X-goog-api-key"
  };
}

function configStatus(env) {
  const cfg = getConfig(env);
  return {
    ok: Boolean(cfg.key),
    service: "sipda-gemchat",
    mode: cfg.key ? "ai-ready" : "missing-key",
    model: cfg.model,
    hasKey: Boolean(cfg.key),
    timestamp: new Date().toISOString()
  };
}

function buildPrompt({ message, history, context }) {
  const serviceContext = Array.isArray(context?.services) ? context.services.slice(0, 180) : [];
  const predictionContext = Array.isArray(context?.predictionRows) ? context.predictionRows.slice(0, 80) : [];
  const rawContext = clean(context?.rawText || "", 18000);
  const hist = Array.isArray(history) ? history.slice(-8) : [];

  return `Ets l'Agent SIPDA integrat dins d'una aplicació d'intel·ligència policial municipal.

MISSIÓ:
Ajudar el comandament a entendre novetats, riscos, patrons, zones, franges, predicció 48 h i accions preventives. Has de respondre en català, amb estil professional, executiu i policial.

NORMES:
- No inventis dades si no apareixen al context.
- Si falta informació, digues-ho clarament.
- Diferencia fets documentats, patró detectat i recomanació operativa.
- Dona respostes útils per comandament: breus, accionables i justificades.
- No revelis claus, secrets ni detalls tècnics interns.
- No donis instruccions il·lícites ni invasives. Mantén criteri legal, proporcional i preventiu.
- Quan et demanin predicció, projecta escenaris probables a 48 h basats en recurrència, zona, franja i prioritat.

CONTEXT OPERATIU NORMALITZAT:
${JSON.stringify(serviceContext, null, 2)}

CONTEXT DE PREDICCIÓ EXISTENT:
${JSON.stringify(predictionContext, null, 2)}

TEXT BRUT / RESUM DOCUMENTAL DISPONIBLE:
${rawContext || "No aportat"}

HISTORIAL RECENT DE CONVERSA:
${JSON.stringify(hist, null, 2)}

PREGUNTA DEL USUARI:
${clean(message, 6000)}

Respon en català. Usa títols curts si ajuda. No utilitzis markdown excessiu.`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const cfg = getConfig(env);

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method === "GET") return reply(configStatus(env));
  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  if (!cfg.key) return reply({ error: "Falta configurar GEMINI_API_KEY", config: configStatus(env) }, 500);

  try {
    const body = await request.json();
    const message = clean(body.message || "", 6000);
    if (!message) return reply({ error: "Message required" }, 400);

    const prompt = buildPrompt({
      message,
      history: body.history || [],
      context: body.context || {}
    });

    const upstreamResponse = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [cfg.header]: cfg.key
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          topP: 0.85,
          maxOutputTokens: 4096
        }
      })
    });

    const upstreamData = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return reply({ error: "Error del motor IA", status: upstreamResponse.status, details: upstreamData }, 502);
    }

    const answer = upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text || "No he pogut generar resposta.";
    return reply({
      motor: "Agent SIPDA",
      model: cfg.model,
      generatedAt: new Date().toISOString(),
      answer
    });
  } catch (error) {
    return reply({ error: "Gem chat failed", detail: error.message }, 500);
  }
}
