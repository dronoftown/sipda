const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const CF_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function clean(value, max = 24000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function stripFence(text) {
  return String(text || "{}")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseStructured(raw) {
  try {
    return JSON.parse(stripFence(raw));
  } catch (_) {
    const s = stripFence(raw);
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(s.slice(start, end + 1)); } catch (_) {}
    }
  }
  return {
    mode: "analysis",
    answer: String(raw || "No he pogut generar resposta."),
    document: null,
    chart: null,
    table: null,
    actions: []
  };
}

function detectMode(message) {
  const m = clean(message, 1000).toLowerCase();
  if (/\b(pdf|document|informe|memòria|memoria|acta)\b/.test(m)) return "document";
  if (/\b(gràfic|grafico|gráfico|chart|barra|pastís|lineal|evolució|evolucion)\b/.test(m)) return "chart";
  if (/\b(taula|tabla|matriu|matriz|llistat|listado)\b/.test(m)) return "table";
  if (/\b(resum|resumen|breu|ràpid|rapido)\b/.test(m)) return "summary";
  return "analysis";
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
    service: "sipda-gemchat",
    mode: "multi-provider-ai",
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
    capabilities: ["analysis", "document", "chart", "table", "attachment", "quota-fallback"],
    timestamp: new Date().toISOString()
  };
}

function buildPrompt({ message, history, context, attachment }) {
  const services = Array.isArray(context?.services) ? context.services.slice(0, 80) : [];
  const predictions = Array.isArray(context?.predictionRows) ? context.predictionRows.slice(0, 40) : [];
  const rawContext = clean(context?.rawText || "", 9000);
  const hist = Array.isArray(history) ? history.slice(-6) : [];
  const desiredMode = detectMode(message);
  const attachmentText = clean(attachment?.text || "", 9000);
  const attachmentMeta = attachment?.name ? JSON.stringify({
    name: attachment.name,
    type: attachment.type || "unknown",
    size: attachment.size || null,
    hasText: Boolean(attachmentText)
  }, null, 2) : "No aportat";

  return `Ets l'Agent SIPDA integrat dins d'una aplicacio d'intelligencia operativa municipal.

MISSIO:
Aportar valor real al comandament. No siguis escuet. Quan et demanin analisi, informe, pdf, grafic o taula, has de desenvolupar la resposta, ordenar-la i donar criteri operatiu.

MODE DETECTAT: ${desiredMode}

REGLES:
- Respon sempre en catala.
- Aporta valor: interpreta, ordena, prioritza i recomana.
- Diferencia fets documentats, patrons, escenaris probables i accions.
- Si falta base documental, digues-ho.
- No inventis dades concretes no disponibles.
- Si et demanen PDF, grafic o taula, genera contingut estructurat per renderitzar-lo dins SIPDA.
- Retorna nomes JSON valid.

ESTRUCTURA JSON:
{
  "mode": "analysis | summary | document | chart | table | mixed",
  "answer": "resposta principal desenvolupada",
  "document": {"title": "", "subtitle": "", "sections": [{"heading": "", "content": ""}]},
  "chart": {"type": "bar | line | doughnut", "title": "", "labels": [], "datasets": [{"label": "", "values": []}]},
  "table": {"title": "", "headers": [], "rows": []},
  "actions": []
}

CONTEXT NORMALITZAT:
${JSON.stringify(services, null, 2)}

PREDICCIO EXISTENT:
${JSON.stringify(predictions, null, 2)}

TEXT DISPONIBLE:
${rawContext || "No aportat"}

FITXER APORTAT:
${attachmentMeta}

TEXT EXTRET DEL FITXER:
${attachmentText || "No aportat"}

HISTORIAL:
${JSON.stringify(hist, null, 2)}

PREGUNTA:
${clean(message, 4000)}
`;
}

async function callCloudflare(env, cfg, prompt) {
  if (!env.AI) throw new Error("Cloudflare AI binding missing");
  const response = await env.AI.run(cfg.cloudflareModel, {
    prompt,
    max_tokens: 4096
  });
  return response?.response || response?.result?.response || response?.text || JSON.stringify(response || {});
}

async function callGemini(cfg, prompt, attachment) {
  if (!cfg.geminiKey) throw new Error("Gemini key missing");
  const parts = [{ text: prompt }];
  if (attachment?.data && attachment?.mimeType) {
    parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  }
  const response = await fetch(cfg.geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": cfg.geminiKey
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.25,
        topP: 0.85,
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
  const response = await fetch(cfg.groqUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + cfg.groqKey
    },
    body: JSON.stringify({
      model: cfg.groqModel,
      messages: [
        { role: "system", content: "Return only valid JSON. Language: Catalan." },
        { role: "user", content: prompt }
      ],
      temperature: 0.25,
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
    return reply({
      error: "Falta configurar almenys una IA",
      needed: ["Binding AI de Cloudflare o GEMINI_API_KEY o GROQ_API_KEY"],
      config: configStatus(env)
    }, 500);
  }

  try {
    const body = await request.json();
    const message = clean(body.message || "", 8000);
    if (!message) return reply({ error: "Message required" }, 400);

    const attachment = body.attachment || null;
    const prompt = buildPrompt({ message, history: body.history || [], context: body.context || {}, attachment });
    const errors = [];

    for (const provider of cfg.providerOrder) {
      try {
        let raw;
        if (provider === "cloudflare") raw = await callCloudflare(env, cfg, prompt);
        else if (provider === "gemini") raw = await callGemini(cfg, prompt, attachment);
        else if (provider === "groq") raw = await callGroq(cfg, prompt);
        else continue;
        const structured = parseStructured(raw);
        return reply({
          motor: provider === "cloudflare" ? "Agent SIPDA · Cloudflare AI" : provider === "gemini" ? "Agent SIPDA · Gemini" : "Agent SIPDA · Groq",
          model: provider === "cloudflare" ? cfg.cloudflareModel : provider === "gemini" ? cfg.geminiModel : cfg.groqModel,
          provider,
          generatedAt: new Date().toISOString(),
          ...structured
        });
      } catch (error) {
        errors.push({ provider, status: error.status || null, quota: isQuotaError(error), message: error.message });
        continue;
      }
    }

    return reply({
      error: "Totes les IA configurades han fallat o han arribat al límit",
      errors,
      recommendation: "Activa el binding AI de Cloudflare a Pages o espera el reinici de quota.",
      config: configStatus(env)
    }, 503);
  } catch (error) {
    return reply({ error: "Gem chat failed", detail: error.message }, 500);
  }
}
