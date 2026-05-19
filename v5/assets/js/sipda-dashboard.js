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

function riskGaugeValue(risk) {
  if (risk === "high") return 86;
  if (risk === "medium") return 56;
  if (risk === "low") return 24;
  return 50;
}

function riskGaugeRotation(risk) {
  return -90 + (riskGaugeValue(risk) / 100) * 180;
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
  const rotation = riskGaugeRotation(risk);

  return `
    <div class="risk-gauge-card risk-${risk}">
      <div class="risk-gauge-copy">
        <span>Risc operatiu</span>
        <strong>${label}</strong>
        <em class="trend ${riskClass(risk)}">nivell actiu</em>
      </div>
      <div class="risk-gauge" aria-label="Nivell de risc ${label}">
        <svg viewBox="0 0 160 94" role="img">
          <path class="gauge-track" d="M22 78 A58 58 0 0 1 138 78" />
          <path class="gauge-low" d="M22 78 A58 58 0 0 1 60 27" />
          <path class="gauge-medium" d="M60 27 A58 58 0 0 1 100 27" />
          <path class="gauge-high" d="M100 27 A58 58 0 0 1 138 78" />
          <g class="gauge-needle" style="transform: rotate(${rotation}deg); transform-origin: 80px 78px;">
            <line x1="80" y1="78" x2="80" y2="31" />
          </g>
          <circle class="gauge-hub" cx="80" cy="78" r="5" />
        </svg>
        <div class="gauge-scale"><span>Baix</span><span>Mitjà</span><span>Alt</span></div>
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
