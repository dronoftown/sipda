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

function buildPredictions(data) {
  const highZones = [...data.hotspots]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 4);

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

function renderDashboard(data) {
  window.SIPDA_OPERATIONAL_DATA = data;
  setTopbar(data);
  setMetricCards(data);
  setAiPanel(data);
  setRiskList(data);
  setTimeline(data);
  setUploadPanel(data);
  setPredictions(data);
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
  feed.innerHTML = `
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

function setRiskList(data) {
  const list = document.querySelector(".zone-list");
  if (!list) return;
  const rows = [...data.hotspots]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 6)
    .map((item) => `<div class="zone-row"><span><i class="dot ${item.risk}"></i>${item.displayAddress || item.zone}</span><b>${item.levelLabel || riskLabel(item.risk)}</b></div>`)
    .join("");
  list.innerHTML = rows;
}

function setTimeline(data) {
  const table = document.querySelector(".table-card");
  if (!table) return;
  const header = table.querySelector(".panel-head");
  const rows = data.timeline.map((item) => `<div class="timeline-row"><time>${item.time}</time><span>${item.title}</span><strong>${item.zone}</strong><em class="badge ${riskClass(item.risk)}">${riskLabel(item.risk)}</em></div>`).join("");
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
