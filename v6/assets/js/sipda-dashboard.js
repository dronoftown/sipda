const SIPDA_DATA_URL = "../v5/data/novetats-2026-05-18.json";

function riskClass(risk) {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  if (risk === "low") return "success";
  return "neutral";
}

function riskLabel(risk) {
  if (risk === "high") return "ALT";
  if (risk === "medium") return "MITJÀ";
  if (risk === "low") return "BAIX";
  return "INFO";
}

function normalizeRiskLevel(level) {
  const value = String(level || "").toLowerCase();
  if (value.includes("alt")) return "high";
  if (value.includes("baix") || value.includes("bajo")) return "low";
  return "medium";
}

function getKpi(data, key, fallback = 0) {
  return data.kpis?.[key] ?? fallback;
}

function sourceTypeOf(item, dataset) {
  const raw = `${item?.sourceType || ""} ${item?.sourceOrigin || ""} ${item?.sourceLabel || ""} ${dataset?.source?.origin || ""} ${dataset?.source?.sourceType || ""}`.toLowerCase();
  if (raw.includes("mossos") || raw.includes("usc") || raw.includes("pg-me") || raw.includes("pgme")) return "MOSSOS";
  if (raw.includes("policia local") || raw.includes("guardia urbana") || raw.includes("pl")) return "PL";
  return item?.sourceType || dataset?.source?.sourceType || "ALTRES";
}

function sourceLabel(type) {
  if (type === "PL") return "Policia Local";
  if (type === "MOSSOS") return "Mossos d’Esquadra";
  return "Altres";
}

function sourceBadge(type) {
  const label = type === "PL" ? "PL" : type === "MOSSOS" ? "ME" : "--";
  const cls = type === "PL" ? "pl" : type === "MOSSOS" ? "me" : "other";
  return `<em class="source-badge ${cls}">${label}</em>`;
}

function getItemsBySource(data, type) {
  return (data.hotspots || []).filter((item) => sourceTypeOf(item, data) === type);
}

function topHotspots(items, limit = 4) {
  return [...items].sort((a, b) => (b.intensity || 0) - (a.intensity || 0)).slice(0, limit);
}

function countByRisk(items, risk) {
  return items.filter((item) => item.risk === risk).length;
}

function timeBucketFromTimeline(items) {
  const buckets = { "matí": 0, "tarda": 0, "tarda-nit": 0, "nit": 0 };
  items.forEach((item) => {
    const hour = Number(String(item.time || "").match(/(\d{1,2})/)?.[1]);
    if (Number.isNaN(hour)) return;
    if (hour >= 6 && hour < 14) buckets["matí"] += 1;
    else if (hour >= 14 && hour < 20) buckets["tarda"] += 1;
    else if (hour >= 20 || hour < 3) buckets["tarda-nit"] += 1;
    else buckets["nit"] += 1;
  });
  return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]?.[0] || "tarda-nit";
}

function buildPredictions(data) {
  const highZones = topHotspots(data.hotspots || [], 4);
  const weekendPressure = highZones.some((item) => /robatori|control|baralla|furt|seguretat/i.test(`${item.title} ${item.category}`));

  return [
    {
      label: "24 h",
      zone: highZones[0]?.displayAddress || highZones[0]?.zone || "Sector 1",
      risk: highZones[0]?.risk || "medium",
      window: "20:00 - 02:00",
      reason: "Concentració recent de serveis rellevants i pressió territorial."
    },
    {
      label: "48 h",
      zone: highZones[1]?.displayAddress || highZones[1]?.zone || "Eix comercial",
      risk: weekendPressure ? "high" : "medium",
      window: "18:00 - 03:00",
      reason: "Patró compatible amb activitat de cap de setmana i franja tarda-nit."
    },
    {
      label: "Cap de setmana",
      zone: "Zones comercials / oci / accessos",
      risk: "medium",
      window: "Divendres - diumenge",
      reason: "Major probabilitat d'activitat policial per afluència, mobilitat i convivència."
    }
  ];
}

function buildSourcePrediction(data, type) {
  const items = getItemsBySource(data, type);
  const timeline = (data.timeline || []).filter((item) => sourceTypeOf(item, data) === type);
  const top = topHotspots(items, 4);
  const high = countByRisk(items, "high");
  const medium = countByRisk(items, "medium");
  const risk = high >= 2 ? "high" : high >= 1 || medium >= 3 ? "medium" : medium >= 1 ? "medium" : "low";
  const bucket = timeBucketFromTimeline(timeline.length ? timeline : top);
  const zone = top[0]?.displayAddress || top[0]?.zone || (type === "PL" ? "eixos municipals i zones comercials" : "zones USC i punts de seguretat ciutadana");
  const secondary = top[1]?.displayAddress || top[1]?.zone || "patrullatge preventiu";
  const services = items.length;
  const body = services
    ? `Pressió acumulada de ${services} punts rellevants. Prioritzar ${zone} i seguiment de ${secondary}. Franja dominant: ${bucket}.`
    : "Encara no hi ha prou dades d’aquest origen al històric carregat.";
  const action = type === "PL"
    ? "Ajustar patrullatge preventiu, trànsit i convivència en els punts amb repetició operativa."
    : "Coordinar seguiment de seguretat ciutadana, robatoris, alarmes i vigilàncies compartides.";

  return { type, label: sourceLabel(type), risk, zone, secondary, services, high, medium, bucket, body, action };
}

function ensureSplitPredictionPanel() {
  let panel = document.getElementById("sourcePredictionPanel");
  if (panel) return panel;
  const mainGrid = document.querySelector(".main-grid");
  if (!mainGrid) return null;
  panel = document.createElement("section");
  panel.id = "sourcePredictionPanel";
  panel.className = "source-prediction-panel";
  panel.innerHTML = `
    <div class="source-prediction-head">
      <div>
        <span>Predicció operativa 48 h</span>
        <h2>Lectura separada per cos policial</h2>
      </div>
      <p>Calculada amb els informes carregats a l’històric SIPDA.</p>
    </div>
    <div class="source-prediction-grid" id="sourcePredictionGrid"></div>
  `;
  mainGrid.insertAdjacentElement("afterend", panel);
  return panel;
}

function renderSourcePredictions(data) {
  ensureSplitPredictionStyles();
  const panel = ensureSplitPredictionPanel();
  const grid = document.getElementById("sourcePredictionGrid");
  if (!panel || !grid) return;
  const predictions = [buildSourcePrediction(data, "PL"), buildSourcePrediction(data, "MOSSOS")];
  grid.innerHTML = predictions.map((item) => `
    <article class="source-prediction-card ${item.type === "PL" ? "pl" : "me"}">
      <div class="source-prediction-title">
        <div class="agency-mark ${item.type === "PL" ? "pl" : "me"}">${item.type === "PL" ? "PL" : "ME"}</div>
        <div>
          <span>${item.label}</span>
          <strong>${riskLabel(item.risk)} · 48 h</strong>
        </div>
      </div>
      <div class="source-prediction-kpis">
        <span><b>${item.services}</b> punts</span>
        <span><b>${item.high}</b> alt</span>
        <span><b>${item.medium}</b> mitjà</span>
      </div>
      <p>${item.body}</p>
      <small>${item.action}</small>
    </article>
  `).join("");
}

function ensureSplitPredictionStyles() {
  if (document.getElementById("sipda-split-prediction-styles")) return;
  const style = document.createElement("style");
  style.id = "sipda-split-prediction-styles";
  style.textContent = `
    .source-prediction-panel{margin:18px 0;display:grid;gap:14px}.source-prediction-head{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:0 2px}.source-prediction-head span{font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:.08em}.source-prediction-head h2{font-size:20px;line-height:1.1;margin:4px 0 0;color:#050505}.source-prediction-head p{margin:0;color:#6b7280;font-size:13px;font-weight:700}.source-prediction-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.source-prediction-card{background:rgba(255,255,255,.92);border:1px solid rgba(229,231,235,.95);box-shadow:0 18px 45px rgba(15,23,42,.08);padding:18px;display:grid;gap:14px}.source-prediction-card.pl{border-top:3px solid #154c7c}.source-prediction-card.me{border-top:3px solid #e30613}.source-prediction-title{display:flex;align-items:center;gap:12px}.agency-mark{width:44px;height:44px;display:grid;place-items:center;color:#fff;font-weight:950;font-size:13px;letter-spacing:.04em;border:1px solid rgba(0,0,0,.08);box-shadow:0 10px 28px rgba(0,0,0,.12)}.agency-mark.pl{background:#154c7c}.agency-mark.me{background:linear-gradient(180deg,#004f9e 0 75%,#fff 75% 83%,#e30613 83% 100%)}.source-prediction-title span{display:block;font-size:12px;color:#6b7280;font-weight:900;text-transform:uppercase}.source-prediction-title strong{font-size:24px;color:#050505;line-height:1}.source-prediction-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.source-prediction-kpis span{background:#f8fafc;border:1px solid #edf0f4;padding:9px 10px;font-size:11px;color:#6b7280;font-weight:900;text-transform:uppercase}.source-prediction-kpis b{display:block;color:#050505;font-size:18px}.source-prediction-card p{margin:0;color:#111827;font-size:13px;line-height:1.5;font-weight:650}.source-prediction-card small{color:#6b7280;font-size:12px;line-height:1.45;font-weight:700}.source-badge{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:22px;border:1px solid #e5e7eb;background:#fff;color:#111;padding:0 7px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}.source-badge.pl{border-color:#b7d0ea;color:#0b4d87;background:#f7fbff}.source-badge.me{border-color:#f3b5bd;color:#b91c1c;background:#fff7f7}.source-badge.pl:before{content:"PL";display:grid;place-items:center;width:18px;height:14px;background:#154c7c;color:#fff;font-size:8px;font-weight:900}.source-badge.me:before{content:"ME";display:grid;place-items:center;width:18px;height:14px;background:#004f9e;color:#fff;font-size:8px;font-weight:900}@media(max-width:820px){.source-prediction-head{display:block}.source-prediction-head p{margin-top:6px}.source-prediction-grid{grid-template-columns:1fr}.source-prediction-title strong{font-size:21px}}
  `;
  document.head.appendChild(style);
}

function renderDashboard(data) {
  window.SIPDA_OPERATIONAL_DATA = data;
  setTopbar(data);
  setMetricCards(data);
  setAiPanel(data);
  setRiskList(data);
  setTimeline(data);
  setUploadPanel(data);
  setPredictions(data);
  renderSourcePredictions(data);
}

function setTopbar(data) {
  const label = document.getElementById("currentDatasetLabel");
  if (label) label.textContent = `${data.source.document} · ${data.source.dateRange}`;
}

function setMetricCards(data) {
  const cards = document.querySelectorAll(".metric-card");
  const risk = normalizeRiskLevel(data.summary.riskLevel);
  const predictionRisk = buildPredictions(data)[1]?.risk || "medium";
  const values = [
    ["Serveis", data.summary.totalServices, "jornada", "neutral"],
    ["Rellevants", data.summary.relevantServices, "prioritat", data.summary.relevantServices > 1 ? "danger" : "warning"],
    ["Risc operatiu", riskLabel(risk), "actiu", riskClass(risk)],
    ["Previsió 48 h", riskLabel(predictionRisk), "estimació", riskClass(predictionRisk)]
  ];

  cards.forEach((card, index) => {
    const item = values[index];
    if (!item) return;
    card.innerHTML = `<span>${item[0]}</span><div><strong>${item[1]}</strong><em class="trend ${item[3]}">${item[2]}</em></div>`;
  });
}

function setAiPanel(data) {
  const feed = document.querySelector(".ai-feed");
  if (!feed) return;
  const pl = getItemsBySource(data, "PL").length;
  const me = getItemsBySource(data, "MOSSOS").length;
  feed.innerHTML = `
    <div class="feed-item"><i class="marker neutral"></i><div><strong>Origen dels informes</strong><span>PL: ${pl} punts · ME: ${me} punts · lectura acumulada activa.</span></div></div>
    <div class="feed-item"><i class="marker danger"></i><div><strong>Lectura executiva</strong><span>${data.summary.executiveRead}</span></div></div>
    <div class="feed-item"><i class="marker warning"></i><div><strong>Patró principal</strong><span>${data.summary.mainPattern}</span></div></div>
    <div class="feed-item"><i class="marker neutral"></i><div><strong>Recomanació</strong><span>${data.summary.recommendation}</span></div></div>
  `;
}

function setPredictions(data) {
  const grid = document.getElementById("predictionGrid");
  if (!grid) return;
  grid.innerHTML = buildPredictions(data).map((item) => `
    <div class="prediction-row ${riskClass(item.risk)}">
      <span>${item.label}</span>
      <strong>${item.zone}</strong>
      <em>${riskLabel(item.risk)} · ${item.window}</em>
      <small>${item.reason}</small>
    </div>
  `).join("");
}

function getBalancedRiskRows(data) {
  const pl = topHotspots(getItemsBySource(data, "PL"), 4);
  const me = topHotspots(getItemsBySource(data, "MOSSOS"), 4);
  const balanced = [];
  const max = Math.max(pl.length, me.length);
  for (let index = 0; index < max; index += 1) {
    if (pl[index]) balanced.push(pl[index]);
    if (me[index]) balanced.push(me[index]);
  }
  const rest = topHotspots(data.hotspots || [], 10).filter((item) => !balanced.some((selected) => selected.id === item.id));
  return [...balanced, ...rest].slice(0, 8);
}

function setRiskList(data) {
  const list = document.querySelector(".zone-list");
  if (!list) return;
  const rows = getBalancedRiskRows(data)
    .map((item) => {
      const type = sourceTypeOf(item, data);
      return `<div class="zone-row"><span>${sourceBadge(type)}<i class="dot ${item.risk}"></i>${item.displayAddress || item.zone}</span><b>${item.levelLabel || riskLabel(item.risk)}</b></div>`;
    })
    .join("");
  list.innerHTML = rows || `<div class="zone-row"><span><i class="dot low"></i>Sense dades carregades</span><b>--</b></div>`;
}

function setTimeline(data) {
  const table = document.querySelector(".table-card");
  if (!table) return;
  const header = table.querySelector(".panel-head") || table.querySelector(".card-header");
  const rows = (data.timeline || []).map((item) => {
    const type = sourceTypeOf(item, data);
    return `<div class="timeline-row"><time>${item.time}</time><span>${sourceBadge(type)}${item.title}</span><strong>${item.zone}</strong><em class="badge ${riskClass(item.risk)}">${riskLabel(item.risk)}</em></div>`;
  }).join("");
  table.innerHTML = `${header ? header.outerHTML : ""}${rows}`;
}

function setUploadPanel(data) {
  const title = document.querySelector(".upload-panel h2");
  const text = document.querySelector(".upload-panel p");
  const label = document.querySelector(".upload-box span");
  if (title) title.textContent = "Entrada documental";
  if (text) text.textContent = `${data.source.document} · importació i lectura operativa.`;
  if (label) label.textContent = "Selecciona un informe PDF";
}

async function initSipdaDashboard() {
  try {
    const response = await fetch(`${SIPDA_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    renderDashboard(data);
  } catch (error) {
    console.warn("SIPDA v6 dashboard data not loaded", error);
  }
}

window.addEventListener("sipda:data-updated", (event) => {
  if (event.detail) renderDashboard(event.detail);
});

document.addEventListener("DOMContentLoaded", initSipdaDashboard);