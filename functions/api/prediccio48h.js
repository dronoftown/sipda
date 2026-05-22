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

function reply(data, status = 200) { return new Response(JSON.stringify(data), { status, headers }); }
function safeText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function clean(value, max = 24000) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, max); }

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
    providerOrder: clean(env.SIPDA_AI_PROVIDER_ORDER || "gemini,cloudflare,groq", 200).split(",").map(x => clean(x).toLowerCase()).filter(Boolean)
  };
}

function configStatus(env) {
  const cfg = getConfig(env);
  return { ok: Boolean(cfg.cloudflareReady || cfg.geminiKey || cfg.groqKey), service: "sipda-prediccio48h", mode: "multi-provider-ai-enriched-gemini-primary", providers: { cloudflare: cfg.cloudflareReady, gemini: Boolean(cfg.geminiKey), groq: Boolean(cfg.groqKey) }, order: cfg.providerOrder, models: { cloudflare: cfg.cloudflareModel, gemini: cfg.geminiModel, groq: cfg.groqModel }, timestamp: new Date().toISOString() };
}

function stripFence(text) { return String(text || "{}").replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim(); }
function firstJsonObject(text) { const s = stripFence(text); const start = s.indexOf("{"); const end = s.lastIndexOf("}"); if (start >= 0 && end > start) return s.slice(start, end + 1); return s; }
function textFallback(raw) { const text = clean(raw, 2400); return { resumExecutiu: text || "La IA ha generat una lectura operativa sense estructura JSON completa.", prediccio48h: [{ risc: "Lectura operativa pendent d'estructurar", zona: "Segons novetats carregades", franja: "Properes 24/48 h", prioritat: "Mitjana", probabilitat: "Mitjana", impacte: "Mitjà", baseDocumental: "Resposta generada per IA a partir del context SIPDA carregat.", prediccio: text.slice(0, 280) || "Cal revisar el contingut de les novetats i validar patrons operatius.", accioPreventiva: "Validar manualment la lectura i reforçar vigilància en zones amb serveis recurrents." }], patronsDetectats: text ? [text.slice(0, 220)] : ["La IA ha retornat resposta no estructurada."], recomanacioComandament: "La predicció s'ha recuperat en mode robust perquè el motor IA no ha retornat JSON pur. Revisar la fila generada i repetir si cal." }; }
function parseAiJson(raw) { const variants = [stripFence(raw), firstJsonObject(raw)]; for (const item of variants) { try { const cleaned = String(item).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"); const parsed = JSON.parse(cleaned); if (typeof parsed === "string") return JSON.parse(stripFence(parsed)); return parsed; } catch (_) {} } return textFallback(raw); }
function priorityRank(v) { const s = clean(v).toLowerCase(); if (s.includes("alta") || s === "high") return 3; if (s.includes("mit") || s === "medium") return 2; return 1; }
function priorityLabel(v) { const r = priorityRank(v); return r === 3 ? "Alta" : r === 2 ? "Mitjana" : "Baixa"; }
function impactFromPriority(v) { const r = priorityRank(v); return r === 3 ? "Alt" : r === 2 ? "Mitjà" : "Baix"; }
function franjaFromTime(t) { const m = String(t || "").match(/(\d{1,2})[:.]/); if (!m) return "Properes 24/48 h"; const h = Number(m[1]); if (h >= 6 && h < 14) return "Matí"; if (h >= 14 && h < 22) return "Tarda i vespre"; return "Nit i matinada"; }
function riskFromService(s) { return clean(s.categoria || s.titol || s.resum || "Risc operatiu").slice(0, 90); }
function zoneFromService(s) { return clean(s.zona || "Zona no determinada").slice(0, 90); }

function supplementalRows(services, existingRows) {
  const used = new Set((existingRows || []).map(r => (clean(r.risc) + "|" + clean(r.zona)).toLowerCase()));
  return services.filter(s => s && (s.zona || s.categoria || s.titol || s.resum)).sort((a, b) => priorityRank(b.prioritat) - priorityRank(a.prioritat)).slice(0, 18).map((s) => {
    const risc = riskFromService(s); const zona = zoneFromService(s); const key = (risc + "|" + zona).toLowerCase(); if (used.has(key)) return null; used.add(key); const p = priorityLabel(s.prioritat); const base = [s.font ? "Font " + s.font : "Servei normalitzat SIPDA", s.n ? "servei " + s.n : "", s.hora ? "hora " + s.hora : ""].filter(Boolean).join(" · ");
    return { risc, zona, franja: franjaFromTime(s.hora), prioritat: p, probabilitat: p === "Alta" ? "Alta" : p === "Mitjana" ? "Mitjana" : "Baixa", impacte: impactFromPriority(s.prioritat), baseDocumental: base || "Servei normalitzat SIPDA", prediccio: "Possible reiteració o derivada operativa vinculada a " + risc + " a " + zona + " durant les pròximes 48 hores.", accioPreventiva: p === "Alta" ? "Incloure punt de vigilància preventiva, pas dinàmic de patrulla i revisió per torn entrant." : "Mantenir observació preventiva i validar evolució amb noves incidències del torn." };
  }).filter(Boolean);
}

function normalizePrediction(parsed, services) {
  if (!parsed || typeof parsed !== "object") parsed = {};
  if (!Array.isArray(parsed.prediccio48h)) parsed.prediccio48h = [];
  if (!Array.isArray(parsed.patronsDetectats)) parsed.patronsDetectats = [];
  if (!parsed.resumExecutiu) parsed.resumExecutiu = "Predicció operativa generada amb les novetats carregades.";
  if (!parsed.recomanacioComandament) parsed.recomanacioComandament = "Revisar les files de predicció i ajustar el dispositiu preventiu segons prioritat i zona.";
  if (!parsed.prediccio48h.length) parsed = textFallback(parsed.resumExecutiu);
  const minRows = Math.min(12, Math.max(6, Math.ceil((services || []).filter(s => priorityRank(s.prioritat) >= 2).length * 0.75)));
  if (parsed.prediccio48h.length < minRows) parsed.prediccio48h = parsed.prediccio48h.concat(supplementalRows(services || [], parsed.prediccio48h)).slice(0, Math.max(minRows, parsed.prediccio48h.length));
  parsed.patronsDetectats = [...new Set(parsed.patronsDetectats.concat((parsed.prediccio48h || []).slice(0, 8).map(r => clean(r.risc)).filter(Boolean)))].slice(0, 10);
  return parsed;
}

function buildPrompt(informePoliciaLocal, informeMossos, serveisNormalitzats) {
  const serveis = Array.isArray(serveisNormalitzats) ? serveisNormalitzats.slice(0, 120) : [];
  const highCount = serveis.filter(s => priorityRank(s.prioritat) >= 3).length;
  const mediumCount = serveis.filter(s => priorityRank(s.prioritat) === 2).length;
  const minRows = Math.min(12, Math.max(6, Math.ceil((highCount + mediumCount) * 0.75)));
  return `Ets SIPDA, sistema d'intel·ligència policial municipal.

Objectiu: generar una predicció operativa real de les properes 48 hores a partir de les novetats carregades.

IMPORTANT:
Retorna nomes JSON valid. No escriguis cap introduccio, cap markdown, cap explicacio fora del JSON.
Genera com a mínim ${minRows} files de predicció si el context ho permet. No et limitis a 3 files.

Regles:
- Escriu només en català.
- Projecta riscos probables, no et limitis a descriure el passat.
- No inventis dades sense base documental.
- Cada fila ha de ser accionable i útil per comandament.
- Policia Local i Mossos tenen valor equivalent.
- Prioritza les files amb prioritat Alta i Mitjana.

JSON obligatori:
{"resumExecutiu":"text","prediccio48h":[{"risc":"text","zona":"text","franja":"text","prioritat":"Alta | Mitjana | Baixa","probabilitat":"Alta | Mitjana | Baixa","impacte":"Alt | Mitjà | Baix","baseDocumental":"text","prediccio":"text","accioPreventiva":"text"}],"patronsDetectats":["text"],"recomanacioComandament":"text"}

SERVEIS NORMALITZATS:
${JSON.stringify(serveis, null, 2)}

INFORME POLICIA LOCAL:
${clean(informePoliciaLocal, 6500) || "No aportat"}

INFORME MOSSOS:
${clean(informeMossos, 6500) || "No aportat"}`;
}

async function callCloudflare(env, cfg, prompt) { if (!env.AI) throw new Error("Cloudflare AI binding missing"); const response = await env.AI.run(cfg.cloudflareModel, { messages: [{ role: "system", content: "Return only valid JSON. No markdown. No prose outside JSON. Language: Catalan. Produce a broad prediction matrix, not only 3 rows." }, { role: "user", content: prompt }], temperature: 0.25, max_tokens: 8192 }); return response?.response || response?.result?.response || response?.text || JSON.stringify(response || {}); }
async function callGemini(cfg, prompt) { if (!cfg.geminiKey) throw new Error("Gemini key missing"); const response = await fetch(cfg.geminiUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": cfg.geminiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, topP: 0.85, maxOutputTokens: 8192, responseMimeType: "application/json" } }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { const err = new Error("Gemini failed"); err.status = response.status; err.details = data; throw err; } return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"; }
async function callGroq(cfg, prompt) { if (!cfg.groqKey) throw new Error("Groq key missing"); const shortPrompt = clean(prompt, 10000); const response = await fetch(cfg.groqUrl, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.groqKey }, body: JSON.stringify({ model: cfg.groqModel, messages: [{ role: "system", content: "Return only valid JSON. Language: Catalan." }, { role: "user", content: shortPrompt }], temperature: 0.2, max_tokens: 4096, response_format: { type: "json_object" } }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { const err = new Error("Groq failed"); err.status = response.status; err.details = data; throw err; } return data?.choices?.[0]?.message?.content || "{}"; }
function isQuotaError(error) { const details = JSON.stringify(error?.details || {}).toLowerCase(); return error?.status === 429 || details.includes("quota") || details.includes("rate") || details.includes("limit"); }

export async function onRequest(context) {
  const { request, env } = context; const cfg = getConfig(env);
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method === "GET") return reply(configStatus(env));
  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);
  if (!cfg.cloudflareReady && !cfg.geminiKey && !cfg.groqKey) return reply({ error: "Falta configurar almenys una IA", config: configStatus(env) }, 500);
  try {
    const body = await request.json(); const informePoliciaLocal = safeText(body.informePoliciaLocal); const informeMossos = safeText(body.informeMossos); const serveisNormalitzats = Array.isArray(body.serveisNormalitzats) ? body.serveisNormalitzats : [];
    if (!informePoliciaLocal && !informeMossos && !serveisNormalitzats.length) return reply({ error: "No reports received" }, 400);
    const prompt = buildPrompt(informePoliciaLocal, informeMossos, serveisNormalitzats); const errors = [];
    for (const provider of cfg.providerOrder) {
      try { let raw; if (provider === "cloudflare") raw = await callCloudflare(env, cfg, prompt); else if (provider === "gemini") raw = await callGemini(cfg, prompt); else if (provider === "groq") raw = await callGroq(cfg, prompt); else continue; const parsed = normalizePrediction(parseAiJson(raw), serveisNormalitzats); return reply({ motor: provider === "cloudflare" ? "SIPDA IA · Cloudflare" : provider === "gemini" ? "SIPDA IA · Gemini" : "SIPDA IA · Groq", model: provider === "cloudflare" ? cfg.cloudflareModel : provider === "gemini" ? cfg.geminiModel : cfg.groqModel, provider, generatA: new Date().toISOString(), ...parsed }); } catch (error) { errors.push({ provider, status: error.status || null, quota: isQuotaError(error), message: error.message }); continue; }
    }
    return reply({ error: "Totes les IA configurades han fallat o han arribat al límit", errors, recommendation: "Revisa que el binding AI de Cloudflare estigui actiu a Pages i fes redeploy.", config: configStatus(env) }, 503);
  } catch (error) { return reply({ error: "Prediction endpoint failed", detail: error.message }, 500); }
}
