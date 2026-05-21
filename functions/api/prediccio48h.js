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

function jsonText(value) {
  return String(value || "{}")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function getConfig(env) {
  const key = env.GEMINI_API_KEY || env.SIPDA_UPSTREAM_KEY || "";
  const url = env.SIPDA_UPSTREAM_URL || DEFAULT_URL;
  const model = env.SIPDA_MODEL || DEFAULT_MODEL;
  return {
    key,
    url,
    model,
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

function buildPrompt(informePoliciaLocal, informeMossos) {
  return `Ets SIPDA, un sistema d'intel·ligència policial municipal.

Analitza les novetats carregades i genera una predicció operativa real per a les properes 48 hores.

Normes obligatòries:
- Escriu sempre en català.
- No repeteixis només el que ja ha passat.
- Has de predir riscos probables a partir dels patrons detectats.
- No limitis artificialment el nombre de resultats.
- Si hi ha molts riscos alts, retorna'ls tots.
- No inventis dades sense base documental.
- Tracta Policia Local i Mossos com dues fonts policials equivalents.
- Retorna només JSON vàlid.

Format obligatori:
{
  "resumExecutiu": "",
  "prediccio48h": [
    {
      "risc": "",
      "zona": "",
      "franja": "",
      "prioritat": "Alta | Mitjana | Baixa",
      "probabilitat": "",
      "impacte": "",
      "baseDocumental": "",
      "prediccio": "",
      "accioPreventiva": ""
    }
  ],
  "patronsDetectats": [],
  "recomanacioComandament": ""
}

INFORME POLICIA LOCAL:
${informePoliciaLocal || "No aportat"}

INFORME MOSSOS:
${informeMossos || "No aportat"}`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const cfg = getConfig(env);

  if (request.method === "OPTIONS") return new Response(null, { headers });

  if (request.method === "GET") {
    return reply(configStatus(env));
  }

  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  if (!cfg.key) {
    return reply({
      error: "Falta configurar la clau Gemini a Cloudflare",
      config: configStatus(env),
      missing: ["GEMINI_API_KEY"]
    }, 500);
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
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      })
    });

    const upstreamData = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return reply({
        error: "Error del motor IA",
        status: upstreamResponse.status,
        details: upstreamData
      }, 502);
    }

    const raw = upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let parsed;

    try {
      parsed = JSON.parse(jsonText(raw));
    } catch (error) {
      return reply({
        error: "El motor IA no ha retornat JSON vàlid",
        raw
      }, 502);
    }

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
