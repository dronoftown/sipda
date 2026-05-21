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

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getConfig(env) {
  const key = env.GEMINI_API_KEY || env.SIPDA_UPSTREAM_KEY || "";
  return {
    key,
    url: env.SIPDA_UPSTREAM_URL || DEFAULT_URL,
    model: env.SIPDA_MODEL || DEFAULT_MODEL,
    header: env.SIPDA_UPSTREAM_KEY_HEADER || "X-goog-api-key"
  };
}

function configStatus(env) {
  const cfg = getConfig(env);
  return {
    ok: Boolean(cfg.key && cfg.url),
    service: "sipda-prediccio48h",
    mode: cfg.key ? "ai-ready" : "missing-key",
    model: cfg.model,
    hasUrl: Boolean(cfg.url),
    hasKey: Boolean(cfg.key),
    accepts: ["GEMINI_API_KEY", "SIPDA_UPSTREAM_KEY"],
    keyHeader: cfg.header,
    timestamp: new Date().toISOString()
  };
}

function stripFence(text) {
  return String(text || "{}")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function firstJsonObject(text) {
  const s = stripFence(text);
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

function parseAiJson(raw) {
  const variants = [];
  variants.push(stripFence(raw));
  variants.push(firstJsonObject(raw));
  try {
    const once = JSON.parse(stripFence(raw));
    if (typeof once === "string") variants.push(stripFence(once), firstJsonObject(once));
    else return once;
  } catch (_) {}

  for (const item of variants) {
    try {
      const cleaned = String(item)
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === "string") return JSON.parse(stripFence(parsed));
      return parsed;
    } catch (_) {}
  }

  throw new Error("INVALID_JSON");
}

function buildPrompt(informePoliciaLocal, informeMossos) {
  return `Ets SIPDA, sistema d'intel·ligència policial municipal.

Objectiu: generar una predicció operativa real de les properes 48 hores a partir de les novetats carregades.

Regles:
- Escriu només en català.
- No expliquis només el que ja ha passat: projecta riscos probables.
- No inventis dades sense base documental.
- No limitis artificialment els riscos importants, però escriu cada fila de forma breu i operativa.
- Cada camp ha de ser concís, màxim 180 caràcters.
- Policia Local i Mossos tenen valor equivalent.
- Retorna NOMÉS JSON vàlid, sense markdown, sense text extra.

JSON obligatori:
{
  "resumExecutiu": "text breu",
  "prediccio48h": [
    {
      "risc": "text",
      "zona": "text",
      "franja": "text",
      "prioritat": "Alta",
      "probabilitat": "Alta",
      "impacte": "Alt",
      "baseDocumental": "text",
      "prediccio": "text",
      "accioPreventiva": "text"
    }
  ],
  "patronsDetectats": ["text"],
  "recomanacioComandament": "text"
}

INFORME POLICIA LOCAL:
${informePoliciaLocal || "No aportat"}

INFORME MOSSOS:
${informeMossos || "No aportat"}`;
}

const responseSchema = {
  type: "OBJECT",
  properties: {
    resumExecutiu: { type: "STRING" },
    prediccio48h: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          risc: { type: "STRING" },
          zona: { type: "STRING" },
          franja: { type: "STRING" },
          prioritat: { type: "STRING" },
          probabilitat: { type: "STRING" },
          impacte: { type: "STRING" },
          baseDocumental: { type: "STRING" },
          prediccio: { type: "STRING" },
          accioPreventiva: { type: "STRING" }
        },
        required: ["risc", "zona", "franja", "prioritat", "probabilitat", "impacte", "baseDocumental", "prediccio", "accioPreventiva"]
      }
    },
    patronsDetectats: { type: "ARRAY", items: { type: "STRING" } },
    recomanacioComandament: { type: "STRING" }
  },
  required: ["resumExecutiu", "prediccio48h", "patronsDetectats", "recomanacioComandament"]
};

export async function onRequest(context) {
  const { request, env } = context;
  const cfg = getConfig(env);

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method === "GET") return reply(configStatus(env));
  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  if (!cfg.key) {
    return reply({ error: "Falta configurar GEMINI_API_KEY", config: configStatus(env) }, 500);
  }

  try {
    const body = await request.json();
    const informePoliciaLocal = safeText(body.informePoliciaLocal);
    const informeMossos = safeText(body.informeMossos);

    if (!informePoliciaLocal && !informeMossos) {
      return reply({ error: "No reports received" }, 400);
    }

    const prompt = buildPrompt(informePoliciaLocal, informeMossos);
    const upstreamResponse = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [cfg.header]: cfg.key
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          topP: 0.8,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema
        }
      })
    });

    const upstreamData = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return reply({ error: "Error del motor IA", status: upstreamResponse.status, details: upstreamData }, 502);
    }

    const raw = upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;
    try {
      parsed = parseAiJson(raw);
    } catch (error) {
      return reply({
        error: "El motor IA no ha retornat JSON vàlid",
        reason: error.message,
        rawPreview: String(raw).slice(0, 2500)
      }, 502);
    }

    if (!Array.isArray(parsed.prediccio48h)) parsed.prediccio48h = [];
    if (!Array.isArray(parsed.patronsDetectats)) parsed.patronsDetectats = [];

    return reply({
      motor: "SIPDA IA",
      model: cfg.model,
      generatA: new Date().toISOString(),
      ...parsed
    });
  } catch (error) {
    return reply({ error: "Prediction endpoint failed", detail: error.message }, 500);
  }
}
