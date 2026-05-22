const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clean(value, max = 24000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function getConfig(env) {
  return {
    cloudflareReady: Boolean(env.AI),
    cloudflareModel: env.SIPDA_CF_MODEL || CF_MODEL,
    geminiKey: env.GEMINI_API_KEY || env.SIPDA_UPSTREAM_KEY || "",
    geminiModel: env.SIPDA_GEMINI_MODEL || env.SIPDA_MODEL || GEMINI_MODEL,
    geminiUrl: env.SIPDA_UPSTREAM_URL || GEMINI_URL,
    groqKey: env.GROQ_API_KEY || "",
    groqModel: env.SIPDA_GROQ_MODEL || GROQ_MODEL,
    groqUrl: env.SIPDA_GROQ_URL || GROQ_URL,
    providerOrder: clean(env.SIPDA_AI_PROVIDER_ORDER || "cloudflare,gemini,groq", 200).split(",").map(x => clean(x).toLowerCase()).filter(Boolean)
  };
}

function configStatus(env) {
  const cfg = getConfig(env);
  return {
    ok: Boolean(cfg.cloudflareReady || cfg.geminiKey || cfg.groqKey),
    service: "sipda-prediccio48h",
    mode: "multi-provider-ai-robust",
    providers: {
      cloudflare: cfg.cloudflareReady,
      gemini: Boolean(cfg.geminiKey),
      groq: Boolean(cfg.groqKey)
    },
    order: cfg.providerOrder,
    models: {
      cloudflare: cfg.cloudflareModel,
      gemini: cfg.geminiModel,
      groq: cfg.groqModel
    },
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

function textFallback(raw) {
  const text = clean(raw, 2400);
  return {
    resumExecutiu: text || "La IA ha generat una lectura operativa sense estructura JSON completa.",
    prediccio48h: [
      {
        risc: "Lectura operativa pendent d'estructurar",
        zona: "Segons novetats carregades",
        franja: "Properes 24/48 h",
        prioritat: "Mitjana",
        probabilitat: "Mitjana",
        impacte: "Mitjà",
        baseDocumental: "Resposta generada per IA a partir del context SIPDA carregat.",
        prediccio: text.slice(0, 280) || "Cal revisar el contingut de les novetats i validar patrons operatius.",
        accioPreventiva: "Validar manualment la lectura i reforçar vigilància en zones amb serveis recurrents."
      }
    ],
    patronsDetectats: text ? [text.slice(0, 220)] : ["La IA ha retornat resposta no estructurada."],
    recomanacioComandament: "La predicció s'ha recuperat en mode robust perquè el motor IA no ha retornat JSON pur. Revisar la fila generada i repetir si cal."
  };
}

function parseAiJson(raw) {
  const variants = [stripFence(raw), firstJsonObject(raw)];
  for (const item of variants) {
    try {
      const cleaned = String(item).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === "string") return JSON.parse(stripFence(parsed));
      return parsed;
    } catch (_) {}
  }
  return textFallback(raw);
}

function normalizePrediction(parsed) {
  if (!parsed || typeof parsed !== "object") parsed = {};
  if (!Array.isArray(parsed.prediccio48h)) parsed.prediccio48h = [];
  if (!Array.isArray(parsed.patronsDetectats)) parsed.patronsDetectats = [];
  if (!parsed.resumExecutiu) parsed.resumExecutiu = "Predicció operativa generada amb les novetats carregades.";
  if (!parsed.recomanacioComandament) parsed.recomanacioComandament = "Revisar les files de predicció i ajustar el dispositiu preventiu segons prioritat i zona.";
  if (!parsed.prediccio48h.length) parsed = textFallback(parsed.resumExecutiu);
  return parsed;
}

function buildPrompt(informePoliciaLocal, informeMossos, serveisNormalitzats) {
  const serveis = Array.isArray(serveisNormalitzats) ? serveisNormalitzats.slice(0, 80) : [];
  return `Ets SIPDA, sistema d'intel·ligència policial municipal.

Objectiu: generar una predicció operativa real de les properes 48 hores a partir de les novetats carregades.

IMPORTANT:
Retorna nomes JSON valid. No escriguis cap introduccio, cap markdown, cap explicacio fora del JSON.

Regles:
- Escriu només en català.
- Projecta riscos probables, no et limitis a descriure el passat.
- No inventis dades sense base documental.
- Cada fila ha de ser breu, accionable i útil per comandament.
- Policia Local i Mossos tenen valor equivalent.
- Si hi ha diversos riscos al context, genera diverses files.

JSON obligatori:
{
  "resumExecutiu": "text breu",
  "prediccio48h": [
    {
      "risc": "text",
      "zona": "text",
      "franja": "text",
      "prioritat": "Alta | Mitjana | Baixa",
      "probabilitat": "Alta | Mitjana | Baixa",
      "impacte": "Alt | Mitjà | Baix",
      "baseDocumental": "text",
      "prediccio": "text",
      "accioPreventiva": "text"
    }
  ],
  "patronsDetectats": ["text"],
  "recomanacioComandament": "text"
}

SERVEIS NORMALITZATS:
${JSON.stringify(serveis, null, 2)}

INFORME POLICIA LOCAL:
${clean(informePoliciaLocal, 4500) || "No aportat"}

INFORME MOSSOS:
${clean(informeMossos, 4500) || "No aportat"}`;
}

async function callCloudflare(env, cfg, prompt) {
  if (!env.AI) throw new Error("Cloudflare AI binding missing");
  const response = await env.AI.run(cfg.cloudflareModel, {
    messages: [
      { role: "system", content: "Return only valid JSON. No markdown. No prose outside JSON. Language: Catalan." },
      { role: "user", content: prompt }
    ],
    temperature: 0.15,
    max_tokens: 4096
  });
  return response?.response || response?.result?.response || response?.text || JSON.stringify(response || {});
}

async function callGemini(cfg, prompt) {
  if (!cfg.geminiKey) throw new Error("Gemini key missing");
  const response = await fetch(cfg.geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": cfg.geminiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.15,
        topP: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error("Gemini failed");
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

async function callGroq(cfg, prompt) {
  if (!cfg.groqKey) throw new Error("Groq key missing");
  const shortPrompt = clean(prompt, 9000);
  const response = await fetch(cfg.groqUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.groqKey },
    body: JSON.stringify({
      model: cfg.groqModel,
      messages: [
        { role: "system", content: "Return only valid JSON. Language: Catalan." },
        { role: "user", content: shortPrompt }
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error("Groq failed");
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data?.choices?.[0]?.message?.content || "{}";
}

function isQuotaError(error) {
  const details = JSON.stringify(error?.details || {}).toLowerCase();
  return error?.status === 429 || details.includes("quota") || details.includes("rate") || details.includes("limit");
}

export async function onRequest(context) {
  const { request, env } = context;
  const cfg = getConfig(env);

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method === "GET") return reply(configStatus(env));
  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  if (!cfg.cloudflareReady && !cfg.geminiKey && !cfg.groqKey) {
    return reply({ error: "Falta configurar almenys una IA", config: configStatus(env) }, 500);
  }

  try {
    const body = await request.json();
    const informePoliciaLocal = safeText(body.informePoliciaLocal);
    const informeMossos = safeText(body.informeMossos);
    const serveisNormalitzats = Array.isArray(body.serveisNormalitzats) ? body.serveisNormalitzats : [];

    if (!informePoliciaLocal && !informeMossos && !serveisNormalitzats.length) {
      return reply({ error: "No reports received" }, 400);
    }

    const prompt = buildPrompt(informePoliciaLocal, informeMossos, serveisNormalitzats);
    const errors = [];

    for (const provider of cfg.providerOrder) {
      try {
        let raw;
        if (provider === "cloudflare") raw = await callCloudflare(env, cfg, prompt);
        else if (provider === "gemini") raw = await callGemini(cfg, prompt);
        else if (provider === "groq") raw = await callGroq(cfg, prompt);
        else continue;
        const parsed = normalizePrediction(parseAiJson(raw));
        return reply({
          motor: provider === "cloudflare" ? "SIPDA IA · Cloudflare" : provider === "gemini" ? "SIPDA IA · Gemini" : "SIPDA IA · Groq",
          model: provider === "cloudflare" ? cfg.cloudflareModel : provider === "gemini" ? cfg.geminiModel : cfg.groqModel,
          provider,
          generatA: new Date().toISOString(),
          ...parsed
        });
      } catch (error) {
        errors.push({ provider, status: error.status || null, quota: isQuotaError(error), message: error.message });
        continue;
      }
    }

    return reply({
      error: "Totes les IA configurades han fallat o han arribat al límit",
      errors,
      recommendation: "Revisa que el binding AI de Cloudflare estigui actiu a Pages i fes redeploy.",
      config: configStatus(env)
    }, 503);
  } catch (error) {
    return reply({ error: "Prediction endpoint failed", detail: error.message }, 500);
  }
}
