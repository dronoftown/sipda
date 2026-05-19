let pendingSipdaDataset = null;
let pendingSipdaFileName = "";

const SIPDA_PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const SIPDA_PDF_WORKER_BASE = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js";
const SIPDA_PDF_WORKER_FALLBACK = `${SIPDA_PDF_WORKER_BASE}/3.11.174/pdf.worker.min.js`;

function setImportStatus(message, type = "info") {
  const status = document.getElementById("importStatus");
  const modalStatus = document.getElementById("importModalStatus");
  if (status) {
    status.textContent = message;
    status.dataset.type = type;
  }
  if (modalStatus) {
    modalStatus.textContent = message;
    modalStatus.dataset.type = type;
  }
}

function setImportProgress(value) {
  const bar = document.getElementById("importProgressBar");
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
}

function setImportStep(step, state) {
  const element = document.querySelector(`[data-import-step="${step}"]`);
  if (!element) return;
  element.dataset.state = state;
}

function resetImportModal() {
  pendingSipdaDataset = null;
  pendingSipdaFileName = "";
  setImportProgress(0);
  setImportStatus("Selecciona un PDF de novetats per iniciar l'anàlisi.", "info");
  ["upload", "read", "analyze", "ready"].forEach((step) => setImportStep(step, "pending"));
  const summary = document.getElementById("importModalSummary");
  const updateButton = document.getElementById("importUpdatePanel");
  const input = document.getElementById("modalPdfInput");
  if (summary) summary.innerHTML = "";
  if (updateButton) updateButton.disabled = true;
  if (input) input.value = "";
}

function openImportModal() {
  const modal = document.getElementById("importModal");
  if (!modal) return;
  resetImportModal();
  modal.hidden = false;
  document.body.classList.add("import-modal-open");
}

function closeImportModal() {
  const modal = document.getElementById("importModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("import-modal-open");
}

function getPdfWorkerSrc(pdfjs) {
  const version = String(pdfjs && pdfjs.version ? pdfjs.version : "");
  if (version.startsWith("4.")) return `${SIPDA_PDF_WORKER_BASE}/${version}/pdf.worker.min.mjs`;
  if (version.startsWith("3.")) return `${SIPDA_PDF_WORKER_BASE}/${version}/pdf.worker.min.js`;
  return SIPDA_PDF_WORKER_FALLBACK;
}

function configurePdfWorker(pdfjs) {
  if (!pdfjs) return null;
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerSrc(pdfjs);
  }
  return pdfjs;
}

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.pdfjsLib) resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("No s'ha pogut carregar PDF.js"));
    document.head.appendChild(script);
  });
}

async function getPdfJs() {
  if (window.pdfjsLib && window.pdfjsLib.getDocument) {
    return configurePdfWorker(window.pdfjsLib);
  }

  await loadScriptOnce(SIPDA_PDF_JS_URL, "sipda-pdfjs-legacy");

  if (!window.pdfjsLib || !window.pdfjsLib.getDocument) {
    throw new Error("PDF.js no està disponible al navegador");
  }

  return configurePdfWorker(window.pdfjsLib);
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[·•]/g, " ")
    .replace(/[^a-z0-9@.\s'_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLine(value) {
  return cleanText(value).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function detectOrigin(text, fileName) {
  const full = `${fileName} ${text}`;
  const source = normalize(full);
  const compact = source.replace(/\s+/g, "");

  if (
    /usc\s+sant\s+feliu\s+de\s+guixols/.test(source) ||
    compact.includes("uscsantfeliudeguixols") ||
    (/\busc\b/.test(source) && /sant\s+feliu\s+de\s+guixols/.test(source)) ||
    (/unitat\s+de\s+seguretat\s+ciutadana/.test(source) && /sant\s+feliu\s+de\s+guixols/.test(source))
  ) {
    return "USC Sant Feliu de Guíxols";
  }

  if (/mossos|pg\s*-?\s*me|policia de la generalitat|cos de mossos/.test(source) || compact.includes("mossosdesquadra") || compact.includes("policiadelageneralitat")) {
    return "Mossos d'Esquadra";
  }

  if (/policia local|guardia urbana|ajuntament|num\. servei|nivell prioritat|desti policia local|destino policia local|secretariapolicia@platjadaro\.com/.test(source) || compact.includes("policialocal")) {
    return "Policia Local";
  }
  return "Origen no determinat";
}

function extractField(block, patterns) {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match && match[1]) return compactLine(match[1]);
  }
  return "";
}

function extractDateTime(block) {
  return extractField(block, [
    /Dia i hora:\s*([^\n]+)/i,
    /Data(?:\s+i\s+hora)?:\s*([^\n]+)/i,
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i
  ]);
}

function extractTime(value) {
  const match = String(value || "").match(/(\d{1,2}:\d{2})/);
  return match ? match[1].padStart(5, "0") : "--:--";
}

function extractServiceId(block, index) {
  return extractField(block, [
    /Núm\. Servei:\s*(\d+)/i,
    /Num\. Servei:\s*(\d+)/i,
    /Servei:\s*([A-Z0-9\-\/]+)/i,
    /Incident:\s*([A-Z0-9\-\/]+)/i
  ]) || `AUTO-${String(index + 1).padStart(3, "0")}`;
}

function extractTitle(block) {
  return extractField(block, [
    /NOTÍCIA\s*([\s\S]*?)\n\s*Requeriment:/i,
    /NOTICIA\s*([\s\S]*?)\n\s*Requeriment:/i,
    /Tipus(?:\s+d'incident)?:\s*([^\n]+)/i,
    /Fet(?:\s+principal)?:\s*([^\n]+)/i,
    /Assumpte:\s*([^\n]+)/i
  ]) || "Servei policial importat";
}

function extractAddress(block) {
  return extractField(block, [
    /Via 1:\s*([^\n]+)/i,
    /Adreça:\s*([^\n]+)/i,
    /Adreca:\s*([^\n]+)/i,
    /Lloc:\s*([^\n]+)/i,
    /Ubicació:\s*([^\n]+)/i,
    /Ubicacio:\s*([^\n]+)/i
  ]);
}

function extractDetail(block) {
  return extractField(block, [
    /Lloc detall:\s*([^\n]+)/i,
    /Detall(?:\s+lloc)?:\s*([^\n]+)/i,
    /Zona:\s*([^\n]+)/i,
    /Sector:\s*([^\n]+)/i
  ]);
}

function extractDescription(block) {
  return extractField(block, [
    /Descripció:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADÍSTICA|\n\s*Resultat:|$)/i,
    /Descripcio:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADISTICA|\n\s*Resultat:|$)/i,
    /Relat:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i,
    /Observacions:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i
  ]).slice(0, 520);
}

function extractResult(block) {
  return extractField(block, [
    /Resultat:\s*([^\n]+)/i,
    /Estat:\s*([^\n]+)/i,
    /Finalització:\s*([^\n]+)/i,
    /Finalitzacio:\s*([^\n]+)/i
  ]) || "Servei importat";
}

function classifyCategory(title, description) {
  const text = normalize(`${title} ${description}`);
  if (/robatori|furt|baralla|agressio|amenac|arma|deten|seguretat ciutadana|ordre public|ocupacio|alarma/.test(text)) return "SEGURETAT_CIUTADANA";
  if (/transit|trànsit|accident|vmp|vehicle|gual|estacion|itv|alcoholemia|drogo|droga|control/.test(text)) return "TRÀNSIT";
  if (/assistencial|menor|persona gran|victima|sanitari|ambulancia|malalt|desorient/.test(text)) return "POLICIA_ASSISTENCIAL";
  if (/inund|arbre|fanal|via publica|dany|anomalia|senyal|neteja|aigua/.test(text)) return "ANOMALIES_VIA_PUBLICA";
  if (/senglar|animal|medi ambient|soroll|residus|incendi|forestal/.test(text)) return "MEDI_AMBIENT";
  if (/vigilancia|vigilància|patrullatge|punt estatic|preventiu/.test(text)) return "VIGILANCIA_PREVENTIVA";
  return "ALTRES";
}

function classifyRisk(title, description, category) {
  const text = normalize(`${title} ${description} ${category}`);
  if (/arma|deten|detingut|robatori|agressio|violencia|baralla|menor escap|inund|incendi|amenac/.test(text)) return "high";
  if (/furt|control|alarma|accident|senglar|gual|arbre|fanal|vigilancia|preventiu|transit|vehicle/.test(text)) return "medium";
  return "low";
}

function levelLabel(risk) {
  if (risk === "high") return "ALT";
  if (risk === "medium") return "MITJÀ";
  return "BAIX";
}

function intensity(risk, category) {
  let score = risk === "high" ? 9 : risk === "medium" ? 6 : 3;
  if (["SEGURETAT_CIUTADANA", "ANOMALIES_VIA_PUBLICA"].includes(category)) score += 1;
  return Math.min(score, 10);
}

function protectAddress(address, title) {
  const text = normalize(`${title} ${address}`);
  if (/domicili|robatori|gual|victima|menor/.test(text)) {
    return compactLine(address).replace(/\s+\d+\b/g, "") + " · ubicació protegida";
  }
  return compactLine(address) || "Zona operativa";
}

function buildGeocode(address, detail) {
  const base = compactLine(address || detail || "");
  if (!base || /^zo\s/i.test(base)) return `${detail || "Platja d'Aro"}, Girona, Spain`;
  if (/girona|spain|catalunya|cataluna|barcelona/i.test(base)) return base;
  return `${base}, Platja d'Aro, Girona, Spain`;
}

function splitServiceBlocks(text) {
  const cleaned = cleanText(text);
  const byService = cleaned.split(/(?=\n?\s*(?:Dia i hora:|Núm\. Servei:|Num\. Servei:|Servei:|Incident:))/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 80);

  if (byService.length > 1) return byService;

  const paragraphs = cleaned.split(/\n\s*\n/g).map((part) => part.trim()).filter((part) => part.length > 80);
  return paragraphs.length ? paragraphs : [cleaned];
}

function parseServices(text, fileName) {
  const origin = detectOrigin(text, fileName);
  const blocks = splitServiceBlocks(text);
  const services = [];

  blocks.forEach((block, index) => {
    const title = extractTitle(block);
    const address = extractAddress(block);
    const detail = extractDetail(block);
    const description = extractDescription(block) || compactLine(block).slice(0, 420);
    const category = classifyCategory(title, description);
    const risk = classifyRisk(title, description, category);
    const dateTime = extractDateTime(block);
    const serviceId = extractServiceId(block, index);
    const hasOperationalSignal = address || detail || /robatori|furt|baralla|accident|control|vigil|inund|menor|vehicle|alarma|assistencial|transit|trànsit/i.test(`${title} ${description}`);
    if (!hasOperationalSignal) return;

    services.push({
      id: `import-${serviceId}-${index}`,
      serviceId,
      time: dateTime || extractTime(block),
      title,
      category,
      risk,
      levelLabel: levelLabel(risk),
      intensity: intensity(risk, category),
      zone: detail || protectAddress(address, title),
      sourceAddress: address,
      displayAddress: protectAddress(address || detail, title),
      geocodeAddress: buildGeocode(address, detail),
      geocodePrecision: address ? "via_o_lloc_importat" : "zona_importada",
      summary: description,
      result: extractResult(block),
      origin,
      privacyLevel: "ANONIMITZAT"
    });
  });

  return { origin, services };
}

function buildIntelligenceDataset(parsed, fileName, rawText) {
  const services = parsed.services;
  const high = services.filter((item) => item.risk === "high").length;
  const medium = services.filter((item) => item.risk === "medium").length;
  const categories = services.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const top = [...services].sort((a, b) => b.intensity - a.intensity).slice(0, 5);
  const riskLevel = high >= 3 ? "ALT" : high >= 1 || medium >= 4 ? "MITJÀ" : "BAIX";
  const topZones = top.map((item) => item.displayAddress || item.zone).filter(Boolean).join(" · ") || "sense zona dominant";

  return {
    source: {
      document: fileName,
      dateRange: services[0]?.time || new Date().toLocaleDateString("ca-ES"),
      origin: parsed.origin,
      privacy: "Dades personals anonimitzades per a vista d'intel·ligència",
      importedAt: new Date().toISOString(),
      rawCharacters: rawText.length
    },
    summary: {
      totalServices: services.length,
      relevantServices: high,
      riskLevel,
      mainPattern: `Predomini de ${Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0]?.replaceAll("_", " ").toLowerCase() || "serveis diversos"} amb punts d'atenció a ${topZones}.`,
      executiveRead: `SIPDA ha importat ${services.length} serveis de ${parsed.origin}. S'han detectat ${high} serveis d'alt risc i ${medium} de risc mitjà. Les zones prioritàries són: ${topZones}.`,
      recommendation: `Prioritzar vigilància preventiva i seguiment operatiu sobre ${topZones}, especialment en franges de tarda-nit i cap de setmana si hi ha continuïtat d'incidències.`
    },
    kpis: {
      transit: categories.TRÀNSIT || 0,
      seguretatCiutadana: categories.SEGURETAT_CIUTADANA || 0,
      assistencial: categories.POLICIA_ASSISTENCIAL || 0,
      anomaliesViaPublica: categories.ANOMALIES_VIA_PUBLICA || 0,
      mediAmbient: categories.MEDI_AMBIENT || 0,
      serveisPlanificats: categories.VIGILANCIA_PREVENTIVA || 0
    },
    hotspots: services.filter((item) => item.risk !== "low"),
    timeline: [...services]
      .sort((a, b) => extractTime(a.time).localeCompare(extractTime(b.time)))
      .slice(0, 18)
      .map((item) => ({ time: extractTime(item.time), serviceId: item.serviceId, title: item.title, zone: item.displayAddress || item.zone, risk: item.risk, result: item.result })),
    privacyRules: [
      "No es mostren noms personals en la vista de comandament.",
      "No es mostren DNI/NIE, telèfons ni matrícules.",
      "Les ubicacions sensibles es mostren a nivell de carrer o zona.",
      "La importació local no puja el PDF a cap servidor."
    ]
  };
}

function renderPendingSummary(dataset) {
  const summary = document.getElementById("importModalSummary");
  if (!summary) return;
  summary.innerHTML = `
    <div class="import-result-grid">
      <div><span>Origen</span><strong>${dataset.source.origin}</strong></div>
      <div><span>Serveis</span><strong>${dataset.summary.totalServices}</strong></div>
      <div><span>Rellevants</span><strong>${dataset.summary.relevantServices}</strong></div>
      <div><span>Risc</span><strong>${dataset.summary.riskLevel}</strong></div>
    </div>
    <p>${dataset.summary.executiveRead}</p>
  `;
}

async function extractPdfText(file) {
  const pdfjs = await getPdfJs();
  configurePdfWorker(pdfjs);
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let page = 1; page <= pdf.numPages; page += 1) {
    setImportStatus(`Llegint PDF... pàgina ${page}/${pdf.numPages}`, "info");
    setImportProgress(15 + Math.round((page / pdf.numPages) * 35));
    const pdfPage = await pdf.getPage(page);
    const content = await pdfPage.getTextContent();
    text += content.items.map((item) => item.str).join("\n") + "\n\n";
  }

  return cleanText(text);
}

async function handleV6Import(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    pendingSipdaDataset = null;
    pendingSipdaFileName = file.name;
    setImportStep("upload", "done");
    setImportStep("read", "active");
    setImportProgress(12);
    setImportStatus(`Novetat rebuda: ${file.name}. Iniciant lectura...`, "info");

    const text = await extractPdfText(file);
    if (!text || text.length < 80) {
      setImportStep("read", "error");
      setImportStatus("No s'ha pogut extreure text útil del PDF. Pot ser escanejat com a imatge.", "error");
      return;
    }

    setImportStep("read", "done");
    setImportStep("analyze", "active");
    setImportProgress(64);
    setImportStatus("Text extret. Aplicant intel·ligència policial SIPDA...", "info");

    await new Promise((resolve) => setTimeout(resolve, 520));
    const parsed = parseServices(text, file.name);
    if (!parsed.services.length) {
      setImportStep("analyze", "error");
      setImportStatus("S'ha llegit el PDF, però no s'han detectat serveis operatius. Revisa el format del document.", "warning");
      console.warn("SIPDA import text preview", text.slice(0, 2500));
      return;
    }

    const dataset = buildIntelligenceDataset(parsed, file.name, text);
    pendingSipdaDataset = dataset;
    setImportStep("analyze", "done");
    setImportStep("ready", "done");
    setImportProgress(100);
    renderPendingSummary(dataset);
    const updateButton = document.getElementById("importUpdatePanel");
    if (updateButton) updateButton.disabled = false;
    setImportStatus(`Anàlisi completada: ${dataset.summary.totalServices} serveis · ${dataset.summary.relevantServices} rellevants.`, "success");
  } catch (error) {
    console.error("SIPDA v6 import error", error);
    setImportStatus(`Error important l'informe: ${error.message || "error desconegut"}.`, "error");
    setImportStep("analyze", "error");
  } finally {
    event.target.value = "";
  }
}

function applyPendingDataset() {
  if (!pendingSipdaDataset) {
    setImportStatus("Encara no hi ha cap anàlisi preparat per actualitzar el panell.", "warning");
    return;
  }
  window.SIPDA_OPERATIONAL_DATA = pendingSipdaDataset;
  window.dispatchEvent(new CustomEvent("sipda:data-updated", { detail: pendingSipdaDataset }));
  setImportStatus(`Panell actualitzat amb ${pendingSipdaFileName}.`, "success");
  setTimeout(closeImportModal, 320);
}

function bindV6Import() {
  const topButton = document.getElementById("pdfImportButton");
  const uploadBox = document.querySelector(".upload-box");
  const closeButton = document.getElementById("importModalClose");
  const cancelButton = document.getElementById("importCancel");
  const chooseButton = document.getElementById("importChooseFile");
  const modalInput = document.getElementById("modalPdfInput");
  const updateButton = document.getElementById("importUpdatePanel");

  if (topButton) topButton.addEventListener("click", openImportModal);
  if (uploadBox) uploadBox.addEventListener("click", openImportModal);
  if (closeButton) closeButton.addEventListener("click", closeImportModal);
  if (cancelButton) cancelButton.addEventListener("click", closeImportModal);
  if (chooseButton && modalInput) chooseButton.addEventListener("click", () => modalInput.click());
  if (modalInput) modalInput.addEventListener("change", handleV6Import);
  if (updateButton) updateButton.addEventListener("click", applyPendingDataset);
}

document.addEventListener("DOMContentLoaded", bindV6Import);
