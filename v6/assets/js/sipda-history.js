const SIPDA_HISTORY_KEY = "sipda.v6.history.datasets";

function readSipdaHistory() {
  try {
    const raw = localStorage.getItem(SIPDA_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("SIPDA history read error", error);
    return [];
  }
}

function saveSipdaHistory(history) {
  try {
    localStorage.setItem(SIPDA_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.warn("SIPDA history save error", error);
    return false;
  }
}

function getDatasetHistoryKey(dataset) {
  const documentName = dataset?.source?.document || "document";
  const importedAt = dataset?.source?.importedAt || dataset?.source?.dateRange || Date.now();
  const services = dataset?.summary?.totalServices || 0;
  return `${documentName}::${importedAt}::${services}`;
}

function addDatasetToSipdaHistory(dataset) {
  const history = readSipdaHistory();
  const key = getDatasetHistoryKey(dataset);
  const normalized = {
    key,
    addedAt: new Date().toISOString(),
    dataset
  };

  const filtered = history.filter((entry) => entry.key !== key);
  filtered.push(normalized);
  saveSipdaHistory(filtered.slice(-60));
  return filtered.slice(-60);
}

function countHighRisk(items) {
  return items.filter((item) => item.risk === "high").length;
}

function countMediumRisk(items) {
  return items.filter((item) => item.risk === "medium").length;
}

function mergeKpis(datasets) {
  return datasets.reduce((acc, dataset) => {
    Object.entries(dataset.kpis || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + (Number(value) || 0);
    });
    return acc;
  }, {});
}

function normalizeHistoryTime(item) {
  return String(item.time || "--:--").slice(0, 5);
}

function mergeSipdaHistory(history) {
  const datasets = history.map((entry) => entry.dataset).filter(Boolean);
  const hotspots = datasets.flatMap((dataset, datasetIndex) =>
    (dataset.hotspots || []).map((item, index) => ({
      ...item,
      id: `${item.id || "hist"}-${datasetIndex}-${index}`,
      sourceDocument: dataset.source?.document,
      sourceOrigin: dataset.source?.origin
    }))
  );

  const timeline = datasets.flatMap((dataset) => dataset.timeline || [])
    .sort((a, b) => normalizeHistoryTime(a).localeCompare(normalizeHistoryTime(b)))
    .slice(-28);

  const high = countHighRisk(hotspots);
  const medium = countMediumRisk(hotspots);
  const totalServices = datasets.reduce((sum, dataset) => sum + (Number(dataset.summary?.totalServices) || 0), 0);
  const origins = [...new Set(datasets.map((dataset) => dataset.source?.origin).filter(Boolean))];
  const docs = datasets.map((dataset) => dataset.source?.document).filter(Boolean);
  const topZones = [...hotspots]
    .sort((a, b) => (b.intensity || 0) - (a.intensity || 0))
    .slice(0, 5)
    .map((item) => item.displayAddress || item.zone)
    .filter(Boolean)
    .join(" · ") || "sense zones dominants";

  const riskLevel = high >= 6 ? "ALT" : high >= 2 || medium >= 6 ? "MITJÀ" : "BAIX";

  return {
    source: {
      document: `Històric SIPDA · ${datasets.length} informes`,
      dateRange: datasets[0]?.source?.dateRange || new Date().toLocaleDateString("ca-ES"),
      origin: origins.join(" + ") || "Històric local",
      importedAt: new Date().toISOString(),
      historicMode: true,
      documents: docs,
      privacy: "Històric local del navegador. No puja cap PDF a servidor."
    },
    summary: {
      totalServices,
      relevantServices: high,
      riskLevel,
      mainPattern: `Lectura acumulada de ${datasets.length} informes amb pressió principal a ${topZones}.`,
      executiveRead: `SIPDA ha consolidat ${datasets.length} informes amb ${totalServices} serveis totals. Hi ha ${high} serveis d'alt risc i ${medium} de risc mitjà. Zones prioritàries: ${topZones}.`,
      recommendation: `Treballar el patrullatge i la previsió sobre les zones repetides del mapa de calor: ${topZones}. Revisar franges de tarda-nit i cap de setmana.`
    },
    kpis: mergeKpis(datasets),
    hotspots,
    timeline,
    privacyRules: [
      "Històric guardat només al navegador.",
      "No es pugen PDFs ni dades a servidor.",
      "Les ubicacions sensibles es mantenen anonimitzades a la vista operativa.",
      "Per històric real multiusuari caldrà base de dades segura."
    ]
  };
}

function setHistoryStatus(message, type = "success") {
  const status = document.getElementById("importModalStatus");
  const panelStatus = document.getElementById("importStatus");
  if (status) {
    status.textContent = message;
    status.dataset.type = type;
  }
  if (panelStatus) {
    panelStatus.textContent = message;
    panelStatus.dataset.type = type;
  }
}

function getPendingSipdaDatasetSafe() {
  try {
    if (typeof pendingSipdaDataset !== "undefined" && pendingSipdaDataset) return pendingSipdaDataset;
  } catch (error) {
    console.warn("SIPDA pending dataset unavailable", error);
  }
  return window.SIPDA_PENDING_DATASET || null;
}

function addPendingDatasetToHistory() {
  const dataset = getPendingSipdaDatasetSafe();
  if (!dataset) {
    setHistoryStatus("Encara no hi ha cap informe preparat per afegir a l'històric.", "warning");
    return;
  }

  const history = addDatasetToSipdaHistory(dataset);
  const merged = mergeSipdaHistory(history);
  window.SIPDA_OPERATIONAL_DATA = merged;
  window.dispatchEvent(new CustomEvent("sipda:data-updated", { detail: merged }));
  setHistoryStatus(`Afegit a l'històric: ${history.length} informes acumulats. Panell actualitzat.`, "success");

  if (typeof closeImportModal === "function") {
    window.setTimeout(closeImportModal, 420);
  }
}

function loadHistoryOnStartup() {
  const history = readSipdaHistory();
  if (!history.length) return;
  const merged = mergeSipdaHistory(history);
  window.setTimeout(() => {
    window.SIPDA_OPERATIONAL_DATA = merged;
    window.dispatchEvent(new CustomEvent("sipda:data-updated", { detail: merged }));
    const status = document.getElementById("importStatus");
    if (status) {
      status.textContent = `Històric local actiu: ${history.length} informes acumulats.`;
      status.dataset.type = "success";
    }
  }, 450);
}

function bindSipdaHistory() {
  const addHistoryButton = document.getElementById("importAddHistory");
  if (addHistoryButton) addHistoryButton.addEventListener("click", addPendingDatasetToHistory);
  loadHistoryOnStartup();
}

window.SIPDA_HISTORY = {
  read: readSipdaHistory,
  save: saveSipdaHistory,
  add: addDatasetToSipdaHistory,
  merge: mergeSipdaHistory,
  addPending: addPendingDatasetToHistory
};

document.addEventListener("DOMContentLoaded", bindSipdaHistory);
