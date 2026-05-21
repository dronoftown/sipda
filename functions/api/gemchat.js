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
  return { mode: "analysis", answer: String(raw || "No he pogut generar resposta."), document: null, chart: null, table: null, actions: [] };
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
    capabilities: ["analysis", "document", "chart", "table", "attachment"],
    timestamp: new Date().toISOString()
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

function buildPrompt({ message, history, context, attachment }) {
  const services = Array.isArray(context?.services) ? context.services.slice(0, 350) : [];
  const predictions = Array.isArray(context?.predictionRows) ? context.predictionRows.slice(0, 160) : [];
  const rawContext = clean(context?.rawText || "", 32000);
  const hist = Array.isArray(history) ? history.slice(-14) : [];
  const desiredMode = detectMode(message);
  const attachmentText = clean(attachment?.text || "", 28000);
  const attachmentMeta = attachment?.name ? JSON.stringify({ name: attachment.name, type: attachment.type || "unknown", size: attachment.size || null, hasText: Boolean(attachmentText), hasFile: Boolean(attachment?.data && attachment?.mimeType) }, null, 2) : "No aportat";

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
${clean(message, 8000)}
`;
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
    const message = clean(body.message || "", 8000);
    if (!message) return reply({ error: "Message required" }, 400);

    const attachment = body.attachment || null;
    const prompt = buildPrompt({ message, history: body.history || [], context: body.context || {}, attachment });
    const parts = [{ text: prompt }];

    if (attachment?.data && attachment?.mimeType) {
      parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    }

    const upstreamResponse = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", [cfg.header]: cfg.key },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 12288,
          responseMimeType: "application/json"
        }
      })
    });

    const upstreamData = await upstreamResponse.json();
    if (!upstreamResponse.ok) return reply({ error: "Error del motor IA", status: upstreamResponse.status, details: upstreamData }, 502);

    const raw = upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const structured = parseStructured(raw);

    return reply({ motor: "Agent SIPDA", model: cfg.model, generatedAt: new Date().toISOString(), ...structured });
  } catch (error) {
    return reply({ error: "Gem chat failed", detail: error.message }, 500);
  }
}
