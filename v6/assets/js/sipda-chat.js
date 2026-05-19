function getSipdaData() {
  return window.SIPDA_OPERATIONAL_DATA || null;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function labelRisk(risk) {
  if (risk === "high") return "ALT";
  if (risk === "medium") return "MITJÀ";
  if (risk === "low") return "BAIX";
  return "INFO";
}

function getTopHotspots(data, limit = 5) {
  return [...(data.hotspots || [])].sort((a, b) => (b.intensity || 0) - (a.intensity || 0)).slice(0, limit);
}

function buildLocalPredictions(data) {
  const top = getTopHotspots(data, 4);
  const weekendPressure = top.some((item) => /robatori|control|baralla|furt|seguretat/i.test(`${item.title} ${item.category}`));

  return [
    { label: "24 h", zone: top[0]?.displayAddress || top[0]?.zone || "Sector 1", risk: top[0]?.risk || "medium", window: "20:00 - 02:00", reason: "Concentració recent de serveis rellevants i pressió territorial detectada." },
    { label: "48 h", zone: top[1]?.displayAddress || top[1]?.zone || "Eix comercial", risk: weekendPressure ? "high" : "medium", window: "18:00 - 03:00", reason: "Patró compatible amb activitat de cap de setmana i franja tarda-nit." },
    { label: "Cap de setmana", zone: "Zones comercials / oci / accessos", risk: "medium", window: "Divendres - diumenge", reason: "Major probabilitat d'activitat policial per afluència, mobilitat i convivència." }
  ];
}

function formatList(items, mapper) {
  return items.map(mapper).join("");
}

function answerBriefing(data) {
  const top = getTopHotspots(data, 4);
  return `
    <strong>Briefing operatiu SIPDA</strong>
    <p>${data.summary?.executiveRead || "Informe carregat i analitzat."}</p>
    <ul>
      <li><b>Serveis totals:</b> ${data.summary?.totalServices ?? "--"}</li>
      <li><b>Serveis rellevants:</b> ${data.summary?.relevantServices ?? "--"}</li>
      <li><b>Risc operatiu:</b> ${data.summary?.riskLevel || "pendent"}</li>
      <li><b>Zones prioritàries:</b> ${top.map((item) => item.displayAddress || item.zone).join(" · ")}</li>
    </ul>
    <p><b>Recomanació:</b> ${data.summary?.recommendation || "Revisar punts calents i ajustar patrullatge preventiu."}</p>`;
}

function answerHotZones(data) {
  const top = getTopHotspots(data, 6);
  return `
    <strong>Zones calentes detectades</strong>
    <p>Classificació segons intensitat, risc i repetició operativa dins dels informes carregats.</p>
    <ul>${formatList(top, (item) => `<li><b>${item.displayAddress || item.zone}</b> · ${labelRisk(item.risk)} · ${item.title}</li>`)}</ul>`;
}

function answerPrediction(data) {
  const predictions = buildLocalPredictions(data);
  return `
    <strong>Predicció operativa a 48 h</strong>
    <p>Estimació basada en les dades carregades a SIPDA, sense connexió externa ni ChatGPT real.</p>
    <ul>${formatList(predictions, (item) => `<li><b>${item.label}</b> · ${item.zone} · <b>${labelRisk(item.risk)}</b> · ${item.window}<br><span>${item.reason}</span></li>`)}</ul>`;
}

function answerRelevantServices(data) {
  const relevant = (data.hotspots || []).filter((item) => item.risk === "high").slice(0, 8);
  return `
    <strong>Serveis rellevants</strong>
    <p>S'han prioritzat els serveis classificats amb risc alt.</p>
    <ul>${formatList(relevant, (item) => `<li><b>${item.time ? item.time.slice(11, 16) : "--:--"}</b> · ${item.title} · ${item.displayAddress || item.zone}</li>`)}</ul>`;
}

function answerReport(data) {
  const predictions = buildLocalPredictions(data);
  const top = getTopHotspots(data, 5);
  return `
    <strong>Informe executiu automàtic</strong>
    <p><b>Objecte:</b> lectura d'intel·ligència operativa sobre l'informe carregat a SIPDA.</p>
    <p><b>Lectura general:</b> ${data.summary?.executiveRead || "Sense lectura executiva disponible."}</p>
    <p><b>Patró principal:</b> ${data.summary?.mainPattern || "Sense patró principal disponible."}</p>
    <p><b>Previsió 48 h:</b> ${predictions[1].zone}, risc ${labelRisk(predictions[1].risk)}, franja ${predictions[1].window}.</p>
    <p><b>Zones prioritàries:</b> ${top.map((item) => item.displayAddress || item.zone).join("; ")}.</p>
    <p><b>Acció recomanada:</b> ${data.summary?.recommendation || "Assignar vigilància preventiva i revisar el mapa de calor."}</p>`;
}

function answerHelp() {
  return `
    <strong>Xat SIPDA local</strong>
    <p>Pots preguntar sobre les dades carregades a la web.</p>
    <ul>
      <li>Fes-me un briefing del servei</li>
      <li>Quines són les zones calentes?</li>
      <li>Quina previsió tenim a 48 hores?</li>
      <li>Quins serveis són rellevants?</li>
      <li>Genera un informe executiu</li>
      <li>Què reforçaries aquest cap de setmana?</li>
    </ul>`;
}

function generateSipdaAnswer(question) {
  const data = getSipdaData();
  if (!data) return `<strong>Encara no hi ha dades carregades</strong><p>Importa un informe o espera que es carregui la jornada base.</p>`;

  const q = normalizeText(question);
  if (!q || /ajuda|que puc|preguntar|com funciona/.test(q)) return answerHelp();
  if (/briefing|resum|torn|servei|situacio/.test(q)) return answerBriefing(data);
  if (/zona|calent|mapa|risc|punt/.test(q)) return answerHotZones(data);
  if (/48|previsio|prediccio|pronostic|cap de setmana|divendres|dissabte|diumenge|avancar/.test(q)) return answerPrediction(data);
  if (/rellevant|important|prioritari|greu/.test(q)) return answerRelevantServices(data);
  if (/informe|executiu|redacta|document/.test(q)) return answerReport(data);
  if (/reforc|reforç|patrulla|dispositiu|recomana/.test(q)) {
    return `<strong>Recomanació operativa</strong><p>${data.summary?.recommendation || "Reforçar punts calents i franges de major pressió."}</p>${answerPrediction(data)}`;
  }

  return `<strong>Lectura SIPDA</strong><p>${data.summary?.executiveRead || "Informe carregat sense lectura executiva."}</p><p>Pots demanar: <b>briefing</b>, <b>zones calentes</b>, <b>previsió 48 h</b> o <b>informe executiu</b>.</p>`;
}

function appendChatMessage(role, html) {
  const log = document.getElementById("sipdaChatLog");
  if (!log) return;
  const item = document.createElement("div");
  item.className = `chat-message ${role}`;
  item.innerHTML = html;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function askSipda(question) {
  const trimmed = String(question || "").trim();
  if (!trimmed) return;
  openChatDrawer();
  appendChatMessage("user", `<p>${trimmed}</p>`);
  appendChatMessage("assistant", generateSipdaAnswer(trimmed));
}

function openChatDrawer() {
  const drawer = document.getElementById("chatDrawer");
  const root = document.getElementById("sipdaFloatingChat");
  if (!drawer || !root) return;
  drawer.hidden = false;
  root.classList.add("is-open");
  const input = document.getElementById("sipdaChatInput");
  if (input) setTimeout(() => input.focus(), 120);
}

function closeChatDrawer() {
  const drawer = document.getElementById("chatDrawer");
  const root = document.getElementById("sipdaFloatingChat");
  if (!drawer || !root) return;
  root.classList.remove("is-open");
  setTimeout(() => { drawer.hidden = true; }, 180);
}

function bindChatDrawer() {
  const toggle = document.getElementById("chatToggle");
  const close = document.getElementById("chatClose");
  if (toggle) toggle.addEventListener("click", openChatDrawer);
  if (close) close.addEventListener("click", closeChatDrawer);
}

function bindQuickPrompts() {
  document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
    button.addEventListener("click", () => askSipda(button.dataset.chatPrompt));
  });
}

function bindChatForm() {
  const form = document.getElementById("sipdaChatForm");
  const input = document.getElementById("sipdaChatInput");
  if (!form || !input) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    askSipda(input.value);
    input.value = "";
  });
}

function initSipdaChat() {
  bindChatDrawer();
  bindQuickPrompts();
  bindChatForm();
  window.addEventListener("sipda:data-updated", () => {
    appendChatMessage("assistant", `<strong>Dades actualitzades</strong><p>He actualitzat la lectura del xat amb el nou informe carregat.</p>`);
  });
}

document.addEventListener("DOMContentLoaded", initSipdaChat);
