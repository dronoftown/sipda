const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

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

function configStatus(env) {
  return {
    ok: Boolean(env.SIPDA_UPSTREAM_URL && env.SIPDA_UPSTREAM_KEY),
    service: "sipda-prediccio48h",
    mode: env.SIPDA_UPSTREAM_URL && env.SIPDA_UPSTREAM_KEY ? "ai-ready" : "missing-config",
    model: env.SIPDA_MODEL || "gemini",
    hasUrl: Boolean(env.SIPDA_UPSTREAM_URL),
    hasKey: Boolean(env.SIPDA_UPSTREAM_KEY),
    keyHeader: env.SIPDA_UPSTREAM_KEY_HEADER || "X-goog-api-key",
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

  if (request.method === "OPTIONS") return new Response(null, { headers });

  if (request.method === "GET") {
    return reply(configStatus(env));
  }

  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  const cfg = configStatus(env);
  if (!cfg.ok) {
    return reply({
      error: "Falten secrets de Cloudflare",
      config: cfg,
      missing: [
        !env.SIPDA_UPSTREAM_URL ? "SIPDA_UPSTREAM_URL" : null,
        !env.SIPDA_UPSTREAM_KEY ? "SIPDA_UPSTREAM_KEY" : null
      ].filter(Boolean)
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
    const headerName = env.SIPDA_UPSTREAM_KEY_HEADER || "X-goog-api-key";

    const upstreamResponse = await fetch(env.SIPDA_UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [headerName]: env.SIPDA_UPSTREAM_KEY
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
      model: env.SIPDA_MODEL || "gemini",
      generatA: new Date().toISOString(),
      ...parsed
    });
  } catch (error) {
    return reply({ error: "Prediction endpoint failed", detail: error.message }, 500);
  }
}
