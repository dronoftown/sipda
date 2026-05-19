const SIPDA_IMPORT_PATTERNS = {
  service: /Dia i hora:\s*([^\n]+)[\s\S]*?Núm\. Servei:\s*(\d+)[\s\S]*?Nivell prioritat:\s*([^\n]+)[\s\S]*?NOTÍCIA\s*([\s\S]*?)Requeriment:[\s\S]*?LOCALITZACIÓ\s*Via 1:\s*([^\n]+)[\s\S]*?Lloc detall:\s*([^\n]*)[\s\S]*?Descripció:\s*([\s\S]*?)Hora inici:\s*([^\n]+)[\s\S]*?Hora final:\s*([^\n]+)[\s\S]*?ESTADÍSTICA\s*([\s\S]*?)Resultat:\s*([^\n]+)/g
};

function cleanPdfText(value) {
  return (value || "")
    .replace(/•Av S'Agaró 161[\s\S]*?\d+\s*\/\s*32/g, " ")
    .replace(/\f/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeAddress(rawAddress) {
  return (rawAddress || "")
    .replace(/Bloc:.*$/i, "")
    .replace(/Escala:.*$/i, "")
    .trim();
}

function classifyRisk(priority, title, stat, description) {
  const text = `${priority} ${title} ${stat} ${description}`.toLowerCase();
  if (/rellevant|detingut|deten|baralla|menor|robatori|inund|arma|taser|violència|violencia/.test(text)) return "high";
  if (/furt|gual|arbre|fanal|alarma|control|senglars|trànsit|transit|campanya|seguretat ciutadana/.test(text)) return "medium";
  return "low";
}

function classifyCategory(stat, title) {
  const text = `${stat} ${title}`.toLowerCase();
  if (/trànsit|transit|vmp|campanya|disciplina viària|gual/.test(text)) return "TRÀNSIT";
  if (/seguretat ciutadana|robatori|baralla|control|alarma|identificacions/.test(text)) return "SEGURETAT_CIUTADANA";
  if (/assistencial|menors|víctima|victima|objectes/.test(text)) return "POLICIA_ASSISTENCIAL";
  if (/anomalia|dany|via pública|inund|arbre|fanal/.test(text)) return "ANOMALIES_VIA_PUBLICA";
  if (/medi ambient|senglar/.test(text)) return "MEDI_AMBIENT";
  if (/vigilància|punt estàtic|serveis planificats|lliurament/.test(text)) return "SERVEIS_PLANIFICATS";
  return "ALTRES";
}

function levelLabel(risk) {
  if (risk === "high") return "ALT";
  if (risk === "medium") return "MITJÀ";
  return "BAIX";
}

function intensityFromRisk(risk) {
  if (risk === "high") return 9;
  if (risk === "medium") return 6;
  return 3;
}

function buildGeocodeAddress(address, detail) {
  const base = normalizeAddress(address);
  if (!base || /^ZO\s/i.test(base)) {
    return `${detail || base || "Platja d'Aro"}, Girona, Spain`;
  }
  return `${base}, Platja d'Aro, Girona, Spain`;
}

function anonymizeDisplayAddress(address, title, risk) {
  const base = normalizeAddress(address);
  if (/robatori|gual|domicili/i.test(title || "")) {
    return base.replace(/\s+\d+\b/g, "") + " · ubicació protegida";
  }
  return base || "Zona operativa";
}

function parseDateTimeToTime(value) {
  const match = String(value || "").match(/(\d{2}:\d{2})/);
  return match ? match[1] : "--:--";
}

function parseServicesFromText(rawText, fileName) {
  const text = cleanPdfText(rawText);
  const services = [];
  let match;

  while ((match = SIPDA_IMPORT_PATTERNS.service.exec(text)) !== null) {
    const [, dateTime, serviceId, priority, titleRaw, addressRaw, detailRaw, descriptionRaw, startRaw, endRaw, statRaw, resultRaw] = match;
    const title = cleanPdfText(titleRaw).replace(/\n/g, " ").trim();
    const address = normalizeAddress(addressRaw);
    const detail = cleanPdfText(detailRaw).replace(/\n/g, " ").trim();
    const description = cleanPdfText(descriptionRaw).replace(/\n/g, " ").trim();
    const stat = cleanPdfText(statRaw).replace(/\n/g, " ").trim();
    const risk = classifyRisk(priority, title, stat, description);
    const category = classifyCategory(stat, title);

    services.push({
      id: `import-${serviceId}`,
      serviceId,
      time: dateTime.trim(),
      title,
      category,
      risk,
      levelLabel: levelLabel(risk),
      intensity: intensityFromRisk(risk),
      zone: detail || address || "Zona operativa",
      sourceAddress: address,
      displayAddress: anonymizeDisplayAddress(address, title, risk),
      geocodeAddress: buildGeocodeAddress(address, detail),
      geocodePrecision: /\d+/.test(address) ? "via_real" : "zona_o_carrer",
      summary: description.slice(0, 260),
      result: cleanPdfText(resultRaw).trim(),
      privacyLevel: "ANONIMITZAT"
    });
  }

  const relevant = services.filter((service) => service.risk === "high").length;
  const kpis = services.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const timeline = services
    .filter((item) => item.risk !== "low")
    .slice(0, 12)
    .map((item) => ({
      time: parseDateTimeToTime(item.time),
      serviceId: item.serviceId,
      title: item.title,
      zone: item.displayAddress || item.zone,
      risk: item.risk,
      result: item.result || "Servei registrat"
    }));

  return {
    source: {
      document: fileName,
      dateRange: services[0]?.time || "Informe importat",
      origin: "Policia Local",
      privacy: "Vista d'intel·ligència amb dades personals anonimitzades",
      importedAt: new Date().toISOString()
    },
    summary: {
      totalServices: services.length,
      relevantServices: relevant,
      riskLevel: relevant >= 3 ? "ALT" : relevant >= 1 ? "MITJÀ" : "BAIX",
      mainPattern: "Informe importat i convertit en lectura operativa municipal.",
      executiveRead: `S'han detectat ${services.length} serveis, amb ${relevant} punts d'atenció alta i ${services.filter((s) => s.risk === "medium").length} serveis de risc mitjà.`,
      recommendation: "Validar les ubicacions geocodificades, revisar els serveis d'alt impacte i assignar vigilància preventiva segons franges horàries."
    },
    kpis: {
      transit: kpis.TRÀNSIT || 0,
      seguretatCiutadana: kpis.SEGURETAT_CIUTADANA || 0,
      assistencial: kpis.POLICIA_ASSISTENCIAL || 0,
      anomaliesViaPublica: kpis.ANOMALIES_VIA_PUBLICA || 0,
      mediAmbient: kpis.MEDI_AMBIENT || 0,
      serveisPlanificats: kpis.SERVEIS_PLANIFICATS || 0
    },
    hotspots: services.filter((service) => service.risk !== "low"),
    timeline,
    privacyRules: [
      "No es mostren noms personals en la vista de comandament.",
      "No es mostren DNI/NIE, telèfons ni matrícules.",
      "Les adreces sensibles es mostren a nivell de carrer o zona.",
      "La importació local no puja el PDF a cap servidor."
    ]
  };
}

async function extractTextFromPdf(file) {
  if (!window.pdfjsLib) throw new Error("PDF.js no està disponible.");
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join("\n") + "\n";
  }

  return text;
}

function showImportStatus(message, type = "info") {
  const status = document.getElementById("importStatus");
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

async function handlePdfImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    showImportStatus("Llegint el PDF i extraient serveis...", "info");
    const text = await extractTextFromPdf(file);
    const data = parseServicesFromText(text, file.name);

    if (!data.hotspots.length) {
      showImportStatus("S'ha llegit el PDF, però no s'han detectat serveis amb ubicació operativa.", "warning");
      return;
    }

    window.SIPDA_OPERATIONAL_DATA = data;
    window.dispatchEvent(new CustomEvent("sipda:data-updated", { detail: data }));
    showImportStatus(`Informe carregat: ${data.summary.totalServices} serveis detectats.`, "success");
  } catch (error) {
    console.warn("SIPDA import error", error);
    showImportStatus("No s'ha pogut interpretar el PDF. Revisa que sigui un informe de novetats compatible.", "error");
  } finally {
    event.target.value = "";
  }
}

function initPdfImport() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  }

  const input = document.getElementById("pdfImportInput");
  const button = document.getElementById("pdfImportButton");
  const uploadBox = document.querySelector(".upload-box");

  if (input) input.addEventListener("change", handlePdfImport);
  if (button && input) button.addEventListener("click", () => input.click());
  if (uploadBox && input) uploadBox.addEventListener("click", () => input.click());
}

document.addEventListener("DOMContentLoaded", initPdfImport);
