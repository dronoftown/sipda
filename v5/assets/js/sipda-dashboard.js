const SIPDA_DATA_URL = "./data/novetats-2026-05-18.json";

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
  const value = String(level || "").trim().toLowerCase();
  if (["alt", "alto", "high"].includes(value)) return "high";
  if (["mitjà", "mitja", "medio", "medium"].includes(value)) return "medium";
  if (["baix", "bajo", "low"].includes(value)) return "low";
  return "medium";
}

function riskScore(risk) {
  if (risk === "high") return 84;
  if (risk === "medium") return 58;
  if (risk === "low") return 24;
  return 50;
}

function riskColor(risk) {
  if (risk === "high") return "#ef4444";
  if (risk === "medium") return "#f59e0b";
  if (risk === "low") return "#16a34a";
  return "#111111";
}

function riskNeedleRotation(risk) {
  return -92 + (riskScore(risk) / 100) * 184;
}

function riskArcLength(risk) {
  return Math.round((riskScore(risk) / 100) * 188);
}

function getKpi(data, key, fallback = 0) {
  return data.kpis?.[key] ?? fallback;
}

function renderDashboard(data) {
  window.SIPDA_OPERATIONAL_DATA = data;
  setTopbar(data);
  setMetricCards(data);
  setMapHeader(data);
  setAiPanel(data);
  setRiskList(data);
  setTimeline(data);
  setUploadPanel(data);
}

function renderRiskGauge(level) {
  const risk = normalizeRiskLevel(level);
  const label = riskLabel(risk);
  const score = riskScore(risk);
  const color = riskColor(risk);
  const rotation = riskNeedleRotation(risk);
  const arc = riskArcLength(risk);

  return `
    <div class="risk-module risk-${risk}" style="--risk-color:${color};--needle-rotation:${rotation}deg;--risk-arc:${arc};">
      <div class="risk-module-head">
        <span>Risc operatiu</span>
        <em>${score}/100</em>
      </div>
      <div class="risk-module-body">
        <div class="risk-readout">
          <strong>${label}</strong>
          <small>nivell actual</small>
        </div>
        <div class="risk-dial" aria-label="Nivell de risc ${label}">
          <svg viewBox="0 0 220 128" role="img">
            <defs>
              <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="rgba(0,0,0,.18)" />
              </filter>
            </defs>
            <path class="dial-track" d="M30 104 A80 80 0 0 1 190 104" />
            <path class="dial-progress" d="M30 104 A80 80 0 0 1 190 104" pathLength="188" />
            <g class="dial-ticks">
              <line x1="30" y1="104" x2="40" y2="98" />
              <line x1="58" y1="48" x2="66" y2="57" />
              <line x1="110" y1="24" x2="110" y2="37" />
              <line x1="162" y1="48" x2="154" y2="57" />
              <line x1="190" y1="104" x2="180" y2="98" />
            </g>
            <g class="dial-needle">
              <line x1="110" y1="104" x2="110" y2="43" />
              <circle cx="110" cy="104" r="8" />
            </g>
          </svg>
          <div class="risk-scale"><span>BAIX</span><span>MITJÀ</span><span>ALT</span></div>
        </div>
      </div>
    </div>
  `;
}

function setMetricCards(data) {
  const cards = document.querySelectorAll(".metric-card");
  const values = [
    ["Serveis", data.summary.totalServices, `${data.summary.relevantServices} rellevants`, "danger"],
    ["Trànsit", getKpi(data, "transit", getKpi(data, "trafico")), "campanyes / disciplina", "warning"],
    ["Seguretat", getKpi(data, "seguretatCiutadana", getKpi(data, "seguridadCiudadana")), "activitat sensible", "danger"]
  ];

  cards.forEach((card, index) => {
    if (index === 3) {
      card.classList.add("risk-meter-card");
      card.innerHTML = renderRiskGauge(data.summary.riskLevel);
      return;
    }

    const item = values[index];
    if (!item) return;
    card.classList.remove("risk-meter-card");
    card.innerHTML = `<span>${item[0]}</span><div><strong>${item[1]}</strong><em class="trend ${item[3]}">${item[2]}</em></div>`;
  });
}

function setTopbar(data) {
  const breadcrumb = document.querySelector(".breadcrumb");
  const title = document.querySelector(".topbar h1");
  if (breadcrumb) breadcrumb.textContent = `SIPDA / Novetats policials / ${data.source.dateRange}`;
  if (title) title.textContent = "Lectura operativa real del servei";
}

function setMapHeader() {
  const mapHeader = document.querySelector(".map-card .card-header p");
  const mapToolbar = document.querySelector(".map-toolbar span");
  if (mapHeader) mapHeader.textContent = "Mapa alimentat amb novetats reals anonimitzades del comunicat policial.";
  if (mapToolbar) mapToolbar.textContent = "Adreces reals · Risc · Calor operatiu";
}

function setAiPanel(data) {
  const subtitle = document.querySelector(".ai-card .card-header p");
  const feed = document.querySelector(".ai-feed");
  if (subtitle) subtitle.textContent = "Resum generat des del PDF policial real.";
  if (!feed) return;

  feed.innerHTML = `
    <div class="feed-item"><i class="marker danger"></i><div><strong>Lectura executiva</strong><span>${data.summary.executiveRead}</span></div></div>
    <div class="feed-item"><i class="marker warning"></i><div><strong>Patró principal</strong><span>${data.summary.mainPattern}</span></div></div>
    <div class="feed-item"><i class="marker neutral"></i><div><strong>Recomanació</strong><span>${data.summary.recommendation}</span></div></div>
  `;
}

function setRiskList(data) {
  const list = document.querySelector(".risk-list");
  if (!list) return;

  const header = list.querySelector(".card-header");
  const topHotspots = [...data.hotspots].sort((a, b) => b.intensity - a.intensity).slice(0, 5);

  const rows = topHotspots.map((item) => {
    return `<div class="zone-row"><span><i class="dot ${item.risk}"></i>${item.displayAddress || item.zone}</span><b>${item.levelLabel || riskLabel(item.risk)}</b></div>`;
  }).join("");

  list.innerHTML = `${header ? header.outerHTML : ""}${rows}`;
}

function setTimeline(data) {
  const table = document.querySelector(".table-card");
  if (!table) return;

  const header = table.querySelector(".card-header");
  const rows = data.timeline.map((item) => {
    return `<div class="timeline-row"><time>${item.time}</time><span>${item.title}</span><strong>${item.zone}</strong><em class="badge ${riskClass(item.risk)}">${riskLabel(item.risk)}</em></div>`;
  }).join("");

  table.innerHTML = `${header ? header.outerHTML : ""}${rows}`;
}

function setUploadPanel(data) {
  const uploadTitle = document.querySelector(".upload-panel h2");
  const uploadText = document.querySelector(".upload-panel p");
  const buttonLabel = document.querySelector(".upload-box span");
  if (uploadTitle) uploadTitle.textContent = "Document interpretat";
  if (uploadText) uploadText.textContent = `${data.source.document} · dades anonimitzades per a vista de comandament.`;
  if (buttonLabel) buttonLabel.textContent = "PDF convertit a intel·ligència operativa";
}

async function initSipdaDashboard() {
  try {
    const response = await fetch(`${SIPDA_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    renderDashboard(data);
  } catch (error) {
    console.warn("SIPDA dashboard data not loaded", error);
  }
}

window.addEventListener("sipda:data-updated", (event) => {
  if (event.detail) renderDashboard(event.detail);
});

document.addEventListener("DOMContentLoaded", initSipdaDashboard);
