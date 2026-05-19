function sipdaSourceTypeFromOrigin(origin) {
  const text = normalize(origin || "");
  if (/mossos|usc|pg\s*-?\s*me|policia de la generalitat|sant feliu de guixols/.test(text)) return "MOSSOS";
  if (/policia local|guardia urbana|platjadaro|platja d'aro/.test(text)) return "PL";
  return "ALTRES";
}

function sipdaSourceLabel(type, origin) {
  if (type === "MOSSOS") return origin && origin !== "Mossos d'Esquadra" ? origin : "Mossos d'Esquadra · USC Sant Feliu de Guíxols";
  if (type === "PL") return "Policia Local Castell-Platja d'Aro";
  return origin || "Origen no determinat";
}

function splitMossosBlocks(text) {
  const cleaned = cleanText(text);
  return cleaned
    .split(/(?=\n?[^\n]{3,140}\s+Codi\s*:\s*\d{8,})/i)
    .map((part) => part.trim())
    .filter((part) => /Codi\s*:\s*\d{8,}/i.test(part) && part.length > 140);
}

function extractMossosField(block, pattern) {
  const match = block.match(pattern);
  return match && match[1] ? compactLine(match[1]) : "";
}

function extractMossosTitle(block) {
  const firstLine = compactLine(block.split("\n")[0] || "").replace(/Codi\s*:\s*\d+.*/i, "");
  const titular = extractMossosField(block, /Titular:\s*([\s\S]*?)\s+Responsable:/i);
  if (titular) return `${firstLine} · ${titular}`;
  return firstLine || extractTitle(block);
}

function normalizeMossosAddress(address, loc, description) {
  const raw = compactLine(address).replace(/\b0{3,}\d*(\.0)?\b/g, "").replace(/\s+\.0\b/g, "").trim();
  const area = normalize(`${loc} ${description}`);
  const municipality = "Castell d'Aro Platja d'Aro i S'Agaró, Baix Empordà, Girona, Catalunya, Spain";
  if (!raw || /^s['’]?agaro$/i.test(raw)) return `S'Agaró, ${municipality}`;
  if (/santiago rusi/i.test(raw)) return `Carrer Santiago Rusiñol 2, Platja d'Aro, ${municipality}`;
  if (/tramuntana/i.test(raw)) return `Carrer Tramuntana ${raw.match(/\d+/)?.[0] || ""}, S'Agaró, ${municipality}`;
  if (/mas sais/i.test(raw)) return `Carrer Mas Sais, S'Agaró, ${municipality}`;
  if (/costa brava/i.test(raw)) return `Avinguda Costa Brava ${raw.match(/\d+/)?.[0] || ""}, Platja d'Aro, ${municipality}`;
  if (/can semi|can sem/i.test(raw)) return `Carrer Can Semí, Castell d'Aro, ${municipality}`;
  if (/platja d['’]?aro/i.test(raw)) return `Avinguda Platja d'Aro ${raw.match(/\d+/)?.[0] || ""}, S'Agaró, ${municipality}`;
  if (/depuradora|edar/i.test(raw)) return `EDAR Castell-Platja d'Aro, Castell d'Aro, ${municipality}`;
  if (/puig de les roques/i.test(raw)) return `Carrer Puig de les Roques Blanques, Castell d'Aro, ${municipality}`;
  if (/gi-662/i.test(raw) || /rotonda de les ovelles|cami vell/i.test(description)) return `Rotonda de les Ovelles, Castell d'Aro, ${municipality}`;
  if (/c-253/i.test(raw) || /politur/i.test(description)) return `Avinguda Politur 1, Platja d'Aro, ${municipality}`;
  if (/pau/i.test(raw)) return `Avinguda de la Pau ${raw.match(/\d+/)?.[0] || "26"}, Platja d'Aro, ${municipality}`;
  if (/s['’]?agaro/i.test(raw)) return `Avinguda S'Agaró ${raw.match(/\d+/)?.[0] || ""}, Platja d'Aro, ${municipality}`;
  if (/castell/i.test(loc)) return `${raw}, Castell d'Aro, ${municipality}`;
  if (/s['’]?agaro/i.test(loc)) return `${raw}, S'Agaró, ${municipality}`;
  return `${raw}, Platja d'Aro, ${municipality}`;
}

function displayMossosAddress(address, loc, title) {
  const raw = compactLine(address).replace(/\b0{3,}\d*(\.0)?\b/g, "").trim();
  const sensitive = /domicili|robatori|ocupacio|alarma|habitatge|casa/i.test(`${title} ${raw}`);
  if (sensitive && raw) return raw.replace(/\s+\d+\b/g, "") + " · ubicació protegida";
  return raw || loc || "Zona operativa";
}

function parseMossosServices(text, fileName) {
  const origin = detectOrigin(text, fileName);
  const sourceType = "MOSSOS";
  const sourceLabel = sipdaSourceLabel(sourceType, origin);
  const blocks = splitMossosBlocks(text);
  const services = [];

  blocks.forEach((block, index) => {
    const code = extractMossosField(block, /Codi\s*:\s*(\d+)/i) || `MOSSOS-${index + 1}`;
    const title = extractMossosTitle(block);
    const start = extractMossosField(block, /Inici\s*:\s*([0-9/]+\s+[0-9:]+)/i);
    const loc = extractMossosField(block, /Loc:\s*([^\n]+?)\s+Adreça:/i);
    const address = extractMossosField(block, /Adreça:\s*([^\n]+)/i);
    const point = extractMossosField(block, /Punt d'interès:\s*([^\n]+)/i);
    const description = extractMossosField(block, /(?:Notícia|Descripció):\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc:|\n\s*Data acceptació|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i) || compactLine(block).slice(0, 520);
    const result = extractMossosField(block, /Resultats\s*:\s*([\s\S]*?)\n\s*Cronologia dels fets\s*:/i) || "Servei tractat";
    const category = classifyCategory(title, description);
    const risk = classifyRisk(title, description, category);
    const geocodeAddress = normalizeMossosAddress(address, loc, `${title} ${description} ${point}`);
    const displayAddress = displayMossosAddress(address, loc, title);

    services.push({
      id: `mossos-${code}-${index}`,
      serviceId: code,
      time: start || extractTime(block),
      title,
      category,
      risk,
      levelLabel: levelLabel(risk),
      intensity: intensity(risk, category),
      zone: point || displayAddress || loc,
      sourceAddress: address,
      displayAddress,
      geocodeAddress,
      geocodePrecision: address ? "mossos_via_o_zona" : "mossos_zona",
      summary: description,
      result,
      origin,
      sourceType,
      sourceLabel,
      sourceBadge: "ME",
      privacyLevel: /domicili|robatori|alarma|ocupacio|habitatge/i.test(`${title} ${address}`) ? "ANONIMITZAT" : "AGREGAT"
    });
  });

  return { origin, services, sourceType, sourceLabel };
}

const sipdaOriginalParseServices = typeof parseServices === "function" ? parseServices : null;
parseServices = function parseServices(text, fileName) {
  const origin = detectOrigin(text, fileName);
  const isMossos = /mossos|usc sant feliu|pg\s*-?\s*me|policia de la generalitat/i.test(`${origin} ${text.slice(0, 1800)}`);
  if (isMossos) return parseMossosServices(text, fileName);
  const parsed = sipdaOriginalParseServices ? sipdaOriginalParseServices(text, fileName) : { origin, services: [] };
  const sourceType = sipdaSourceTypeFromOrigin(parsed.origin);
  const sourceLabel = sipdaSourceLabel(sourceType, parsed.origin);
  parsed.sourceType = sourceType;
  parsed.sourceLabel = sourceLabel;
  parsed.services = (parsed.services || []).map((item) => ({ ...item, sourceType, sourceLabel, sourceBadge: sourceType === "PL" ? "PL" : "ME" }));
  return parsed;
};

const sipdaOriginalBuildDataset = typeof buildIntelligenceDataset === "function" ? buildIntelligenceDataset : null;
buildIntelligenceDataset = function buildIntelligenceDataset(parsed, fileName, rawText) {
  const dataset = sipdaOriginalBuildDataset(parsed, fileName, rawText);
  const services = parsed.services || dataset.hotspots || [];
  const sourceType = parsed.sourceType || sipdaSourceTypeFromOrigin(parsed.origin || dataset.source.origin);
  dataset.source.sourceType = sourceType;
  dataset.source.sourceLabel = parsed.sourceLabel || sipdaSourceLabel(sourceType, dataset.source.origin);
  dataset.sourceStats = services.reduce((acc, item) => {
    const key = item.sourceType || sourceType || "ALTRES";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  dataset.hotspots = (dataset.hotspots || []).map((item) => ({ ...item, sourceType: item.sourceType || sourceType, sourceLabel: item.sourceLabel || dataset.source.sourceLabel, sourceBadge: item.sourceBadge || (sourceType === "PL" ? "PL" : "ME") }));
  dataset.timeline = (dataset.timeline || []).map((item) => ({ ...item, sourceType: item.sourceType || sourceType, sourceLabel: item.sourceLabel || dataset.source.sourceLabel, sourceBadge: item.sourceBadge || (sourceType === "PL" ? "PL" : "ME") }));
  dataset.summary.executiveRead = `${dataset.summary.executiveRead} Origen operatiu: ${dataset.source.sourceLabel}.`;
  return dataset;
};