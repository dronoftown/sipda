function sipdaNormalizeOriginText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[·•]/g, " ")
    .replace(/[^a-z0-9@.\s'_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sipdaCompactOriginText(value) {
  return sipdaNormalizeOriginText(value).replace(/\s+/g, "");
}

window.detectOrigin = function detectOrigin(text, fileName) {
  const source = sipdaNormalizeOriginText(`${fileName} ${text}`);
  const compact = sipdaCompactOriginText(`${fileName} ${text}`);

  if (
    /usc\s+sant\s+feliu\s+de\s+guixols/.test(source) ||
    compact.includes("uscsantfeliudeguixols") ||
    (/\busc\b/.test(source) && /sant\s+feliu\s+de\s+guixols/.test(source))
  ) {
    return "USC Sant Feliu de Guíxols";
  }

  if (/unitat\s+de\s+seguretat\s+ciutadana/.test(source) && /sant\s+feliu\s+de\s+guixols/.test(source)) {
    return "USC Sant Feliu de Guíxols";
  }

  if (
    /mossos d[' ]?esquadra/.test(source) ||
    /policia de la generalitat/.test(source) ||
    /cos de mossos/.test(source) ||
    /\bpg\s*-?\s*me\b/.test(source) ||
    compact.includes("pgme") ||
    compact.includes("mossosdesquadra") ||
    compact.includes("policiadelageneralitat")
  ) {
    return "Mossos d'Esquadra";
  }

  if (
    /policia local/.test(source) ||
    /guardia urbana/.test(source) ||
    /desti policia local/.test(source) ||
    /destino policia local/.test(source) ||
    /ajuntament de castell d'aro/.test(source) ||
    /ajuntament de platja d'aro/.test(source) ||
    /secretariapolicia@platjadaro\.com/.test(source) ||
    compact.includes("policialocal")
  ) {
    return "Policia Local";
  }

  return "Origen no determinat";
};
