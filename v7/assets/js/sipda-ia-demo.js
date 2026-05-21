(function(){
  const BUILD = 'sipda-v7-prediccio-dinamica-sense-limit-2026-05-21';
  const HISTORY_KEY = 'sipda.v7.history.datasets';
  const agentUrl = 'https://m365.cloud.microsoft/chat/';

  const thinkingSteps = [
    'Llegint novetats de Policia Local i Mossos...',
    'Classificant deteccions en alta, mitjana i baixa...',
    'Creuant zones, franges horàries i recurrències...',
    'Projectant escenaris probables de les properes 48 hores...',
    'Generant accions preventives per comandament...',
    'Preparant matriu predictiva completa sense límit de resultats...'
  ];

  function byId(id){ return document.getElementById(id); }
  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function norm(value){
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s/.-]/g,' ').replace(/\s+/g,' ').trim();
  }
  function hourOf(service){
    const match = String(service.time || '').match(/(\d{1,2})/);
    return match ? Number(match[1]) : null;
  }
  function bandOf(service){
    const h = hourOf(service);
    if(h === null || Number.isNaN(h)) return 'Franja pendent de validar';
    if(h >= 6 && h < 14) return 'Matí · 06:00-14:00';
    if(h >= 14 && h < 20) return 'Tarda · 14:00-20:00';
    if(h >= 20 && h < 24) return 'Vespre-nit · 20:00-00:00';
    return 'Matinada · 00:00-06:00';
  }
  function sourceName(type){
    if(type === 'PL') return 'Policia Local';
    if(type === 'MOSSOS') return "Mossos d'Esquadra";
    return 'Altres';
  }
  function sourceBadge(type){
    if(type === 'PL') return 'PL';
    if(type === 'MOSSOS') return 'ME';
    return '--';
  }
  function baseScore(priority){
    if(priority === 'high') return 9;
    if(priority === 'medium') return 6;
    return 3;
  }
  function classify(service){
    const x = norm([service.title, service.summary, service.category, service.zone].join(' '));
    if(/arma|agressio|violencia|robatori|ocupacio|deten|detingut|baralla|amenac|incendi|menor escap|entrada a domicili|habitatge/.test(x)) return 'high';
    if(/alarma|furt|accident|control|vigilancia|vigilancia preventiva|preventiu|transit|vehicle|vmp|senglar|dany|molesties|conflicte/.test(x)) return service.priority === 'high' ? 'high' : 'medium';
    return service.priority || 'low';
  }
  function priorityLabel(priority){
    return priority === 'high' ? 'Alta' : priority === 'medium' ? 'Mitjana' : 'Baixa';
  }
  function priorityClass(priority){
    return priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low';
  }
  function readDatasetsFromStorage(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      return history.map(item => item.dataset || item).filter(Boolean);
    }catch(error){
      return [];
    }
  }
  function getServices(){
    try{
      if(typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.services)){
        return DATA.services.map((service, index) => ({...service, _index:index}));
      }
    }catch(error){}
    const datasets = readDatasetsFromStorage();
    return datasets.flatMap((dataset, datasetIndex) => (dataset.services || []).map((service, serviceIndex) => ({...service, _index: serviceIndex, _dataset: datasetIndex})));
  }
  function mapCount(items, keyFn){
    const map = new Map();
    items.forEach(item => {
      const key = keyFn(item) || 'No determinat';
      const current = map.get(key) || {key, count:0, score:0};
      current.count += 1;
      current.score += baseScore(item._priority);
      map.set(key, current);
    });
    return map;
  }
  function topFromMap(map, limit){
    return [...map.values()].sort((a,b) => b.score - a.score || b.count - a.count).slice(0, limit);
  }
  function buildStats(services){
    return {
      byZone: mapCount(services, s => s.zone || s.address || 'Zona no determinada'),
      byCategory: mapCount(services, s => s.category || 'Tipologia no determinada'),
      byBand: mapCount(services, bandOf),
      bySource: mapCount(services, s => sourceName(s.sourceType)),
      byZoneCategory: mapCount(services, s => `${s.zone || 'Zona no determinada'} · ${s.category || 'Tipologia no determinada'}`)
    };
  }
  function probabilityFor(service, stats){
    const zone = stats.byZone.get(service.zone || 'Zona no determinada')?.count || 0;
    const category = stats.byCategory.get(service.category || 'Tipologia no determinada')?.count || 0;
    const zoneCategory = stats.byZoneCategory.get(`${service.zone || 'Zona no determinada'} · ${service.category || 'Tipologia no determinada'}`)?.count || 0;
    const recurrence = zone + category + zoneCategory;
    if(service._priority === 'high' && recurrence >= 7) return 'Alta';
    if(service._priority === 'high' && recurrence >= 4) return 'Mitjana-alta';
    if(service._priority === 'high') return 'Mitjana-alta';
    if(service._priority === 'medium' && recurrence >= 5) return 'Mitjana-alta';
    if(service._priority === 'medium') return 'Mitjana';
    return recurrence >= 5 ? 'Mitjana' : 'Baixa';
  }
  function impactFor(service){
    const x = norm([service.title, service.summary, service.category].join(' '));
    if(service._priority === 'high') return /arma|violencia|agressio|robatori|ocupacio|incendi|menor|deten/.test(x) ? 'Alt' : 'Moderat-alt';
    if(service._priority === 'medium') return 'Moderat';
    return 'Baix';
  }
  function actionFor(service){
    const x = norm([service.title, service.summary, service.category].join(' '));
    if(/robatori|furt|habitatge|patrimoni|ocupacio/.test(x)) return 'Reforçar patrullatge preventiu i discret a la zona, controlar punts d’accés i mantenir coordinació PL/ME en franja de risc.';
    if(/baralla|agressio|amenac|violencia|seguretat ciutadana|ordre public/.test(x)) return 'Planificar presència visible, binomi preventiu i resposta ràpida en la franja probable, amb especial atenció a punts de concentració.';
    if(/alarma/.test(x)) return 'Incrementar rondes preventives nocturnes, comprovar punts sensibles i revisar recurrència amb serveis anteriors.';
    if(/transit|vehicle|vmp|accident|control|alcoholemia|drogo/.test(x)) return 'Activar control dinàmic de trànsit/VMP, presència dissuasiva i vigilància en eixos de mobilitat recurrents.';
    if(/molesties|soroll|convivencia|incivisme/.test(x)) return 'Reforçar proximitat i presència preventiva en tarda-nit, amb intervenció anticipada abans que escali el requeriment.';
    if(/assistencial|menor|persona gran|sanitari|desorient/.test(x)) return 'Mantenir patrullatge de proximitat, coordinació amb serveis assistencials i disponibilitat de resposta prioritària.';
    if(/medi ambient|senglar|animal|incendi|forestal/.test(x)) return 'Fer vigilància preventiva de l’entorn, avisos interns i coordinació amb serveis municipals o emergències si apareix recurrència.';
    return 'Mantenir seguiment preventiu de la zona i revisar si es repeteix el patró en el proper torn.';
  }
  function predictionFor(service, stats){
    const category = service.category || 'servei policial';
    const zone = service.zone || service.address || 'zona no determinada';
    const band = bandOf(service).toLowerCase();
    const zoneCount = stats.byZone.get(zone)?.count || 1;
    const catCount = stats.byCategory.get(category)?.count || 1;
    const x = norm([service.title, service.summary, category].join(' '));
    if(/robatori|furt|habitatge|patrimoni|ocupacio/.test(x)) return `És probable que durant les properes 48 hores es mantingui risc contra patrimoni o requeriments vinculats a ${category.toLowerCase()} a ${zone}, especialment en ${band}.`;
    if(/baralla|agressio|amenac|violencia|seguretat ciutadana|ordre public/.test(x)) return `És probable que es reprodueixin serveis de seguretat ciutadana o alteracions de convivència a ${zone}, amb més pressió en ${band}.`;
    if(/transit|vehicle|vmp|accident|control|alcoholemia|drogo/.test(x)) return `Es preveu pressió operativa de trànsit, mobilitat o VMP a ${zone}, amb possibilitat de nous serveis durant ${band}.`;
    if(/alarma/.test(x)) return `Es manté risc de noves activacions d’alarma o comprovacions de seguretat a ${zone}, especialment si coincideix amb franges nocturnes o de baixa presència ciutadana.`;
    if(/molesties|soroll|convivencia|incivisme/.test(x)) return `És previsible que apareguin nous requeriments de convivència, molèsties o ús intensiu de l’espai públic a ${zone}, sobretot en ${band}.`;
    if(/assistencial|menor|persona gran|sanitari|desorient/.test(x)) return `Es pot repetir demanda assistencial o de protecció de persones vulnerables a ${zone}, amb necessitat de resposta ràpida si el patró torna a aparèixer.`;
    return `Amb base en ${zoneCount} servei(s) de zona i ${catCount} detecció/ns de tipologia ${category}, es projecta risc operatiu de nous serveis similars a ${zone} durant les properes 48 hores.`;
  }
  function evidenceFor(service, stats){
    const zone = service.zone || 'zona no determinada';
    const category = service.category || 'tipologia no determinada';
    const zoneCount = stats.byZone.get(zone)?.count || 1;
    const catCount = stats.byCategory.get(category)?.count || 1;
    return `${sourceName(service.sourceType)} · servei ${service.serviceId || service.id || 'sense codi'} · ${category}. Recurrència: ${zoneCount} servei(s) a la zona i ${catCount} de la mateixa tipologia.`;
  }
  function rowFromService(service, stats, index){
    return {
      number: index + 1,
      priority: service._priority,
      risk: service.category || service.title || 'Risc operatiu',
      source: sourceBadge(service.sourceType),
      sourceName: sourceName(service.sourceType),
      zone: service.zone || service.address || 'Zona no determinada',
      band: bandOf(service),
      probability: probabilityFor(service, stats),
      impact: impactFor(service),
      prediction: predictionFor(service, stats),
      action: actionFor(service),
      evidence: evidenceFor(service, stats),
      title: service.title || 'Servei detectat'
    };
  }
  function analyse(){
    const services = getServices().map((service, index) => ({...service, _index:index, _priority: classify(service)}));
    const stats = buildStats(services);
    const groups = {
      high: services.filter(s => s._priority === 'high'),
      medium: services.filter(s => s._priority === 'medium'),
      low: services.filter(s => s._priority === 'low')
    };
    const sourceStats = services.reduce((acc, service) => {
      const key = service.sourceType === 'MOSSOS' ? 'MOSSOS' : service.sourceType === 'PL' ? 'PL' : 'ALTRES';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {PL:0, MOSSOS:0, ALTRES:0});
    const totalScore = services.reduce((sum, service) => sum + baseScore(service._priority), 0);
    const riskScore = services.length ? Math.min(100, Math.round((totalScore / Math.max(services.length, 1)) * 8 + groups.high.length * 3 + groups.medium.length)) : 0;
    const globalLevel = riskScore >= 75 || groups.high.length >= 10 ? 'Alt' : riskScore >= 45 || groups.high.length >= 1 ? 'Moderat-alt' : services.length ? 'Moderat' : 'Pendent';
    const topZones = topFromMap(stats.byZone, 6);
    const topCategories = topFromMap(stats.byCategory, 6);
    return {
      services, stats, groups, sourceStats, riskScore, globalLevel, topZones, topCategories,
      rowsHigh: groups.high.map((s, i) => rowFromService(s, stats, i)),
      rowsMedium: groups.medium.map((s, i) => rowFromService(s, stats, i)),
      rowsLow: groups.low.map((s, i) => rowFromService(s, stats, i))
    };
  }

  function addStyle(){
    if(byId('sipda-ia-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'sipda-ia-demo-style';
    style.textContent = `
      .is-locked .sipda-ia-btn,.is-locked .sipda-prediction-48-btn{display:none!important}
      .sipda-ia-btn{position:fixed;right:24px;bottom:24px;z-index:9000;display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;background:#0054A6;color:#fff;font-weight:800;font-size:14px;box-shadow:0 18px 40px rgba(0,84,166,.28);cursor:pointer}
      .sipda-ia-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18)}
      .sipda-ia-panel{position:fixed;top:0;right:0;z-index:9999;width:min(460px,100vw);height:100vh;background:#fff;border-left:1px solid #e5e7eb;box-shadow:-24px 0 70px rgba(15,23,42,.18);transform:translateX(100%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif}
      .sipda-ia-panel.is-open{transform:translateX(0)}
      .sipda-ia-header{height:72px;padding:16px 18px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;justify-content:space-between;background:#fff}.sipda-ia-header strong{display:block;font-size:16px;color:#101828}.sipda-ia-header span{display:block;margin-top:2px;font-size:12px;color:#667085}.sipda-ia-close{width:38px;height:38px;border:0;border-radius:12px;background:#f2f4f7;color:#101828;font-size:24px;cursor:pointer}
      .sipda-ia-warning{padding:10px 18px;background:#eff6ff;color:#0f3f74;border-bottom:1px solid #bfdbfe;font-size:12px;font-weight:700;line-height:1.35}.sipda-ia-body{flex:1;min-height:0;overflow:auto;background:#f8fafc;padding:18px;display:flex;flex-direction:column;gap:12px}.sipda-ia-msg{max-width:88%;padding:12px 14px;border-radius:18px;font-size:13px;line-height:1.45;box-shadow:0 10px 28px rgba(15,23,42,.06)}.sipda-ia-msg.bot{align-self:flex-start;background:#fff;color:#344054;border:1px solid #eef2f7}.sipda-ia-msg.user{align-self:flex-end;background:#0054A6;color:#fff}.sipda-ia-msg small{display:block;margin-bottom:5px;font-size:11px;font-weight:800;color:#0054A6}.sipda-ia-msg.user small{color:#dbeafe}.sipda-ia-actions{padding:12px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:8px;flex-wrap:wrap}.sipda-ia-chip{border:1px solid #d0d5dd;border-radius:999px;background:#fff;color:#344054;padding:9px 12px;font-weight:700;font-size:12px;cursor:pointer}.sipda-ia-chip.primary{background:#0054A6;color:#fff;border-color:#0054A6}.sipda-ia-compose{padding:14px 18px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:10px}.sipda-ia-input{flex:1;height:42px;border:1px solid #d0d5dd;border-radius:14px;padding:0 12px;font-size:13px}.sipda-ia-send{width:46px;border:0;border-radius:14px;background:#0054A6;color:#fff;font-weight:900;cursor:pointer}.sipda-ia-overlay{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.26);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .24s ease}.sipda-ia-overlay.is-open{opacity:1;pointer-events:auto}
      .sipda-prediction-48-btn{background:#08111f!important;color:#fff!important;border-color:#08111f!important;box-shadow:0 14px 32px rgba(8,17,31,.18)}
      .sipda-prediction-modal{position:fixed;inset:0;z-index:10020;background:rgba(15,23,42,.50);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif}.sipda-prediction-modal[hidden]{display:none!important}.sipda-prediction-card{position:relative;width:min(1180px,96vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid rgba(255,255,255,.78);border-radius:30px;box-shadow:0 34px 95px rgba(15,23,42,.34);padding:28px;animation:sipdaPredIn .26s ease}.sipda-prediction-close{position:absolute;top:18px;right:18px;width:40px;height:40px;border:0;border-radius:999px;background:#f1f5f9;color:#0f172a;font-size:25px;line-height:1;cursor:pointer}.sipda-prediction-kicker{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#eef6ff;color:#0054A6;padding:7px 11px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px}.sipda-prediction-kicker:before{content:"";width:8px;height:8px;border-radius:999px;background:#38bdf8;box-shadow:0 0 0 5px rgba(56,189,248,.14)}.sipda-prediction-title{padding-right:54px}.sipda-prediction-title h2{margin:0;font-size:30px;line-height:1.08;color:#0f172a;letter-spacing:-.04em}.sipda-prediction-title p{margin:10px 0 0;color:#64748b;font-size:14px;line-height:1.45}.sipda-prediction-thinking{display:grid;grid-template-columns:64px 1fr;gap:18px;align-items:center;margin-top:22px;padding:22px;border:1px solid #e2e8f0;border-radius:24px;background:linear-gradient(180deg,#fff,#f8fafc)}.sipda-prediction-spinner{width:56px;height:56px;border-radius:999px;border:4px solid #e2e8f0;border-top-color:#0054A6;animation:sipdaPredSpin .82s linear infinite}.sipda-prediction-thinking strong{display:block;color:#0f172a;font-size:16px;margin-bottom:6px}.sipda-prediction-thinking p{margin:0;color:#64748b;font-size:14px}.sipda-prediction-progress{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:14px}.sipda-prediction-progress span{display:block;height:100%;width:32%;border-radius:999px;background:linear-gradient(90deg,#0054A6,#38bdf8);animation:sipdaPredProgress 1.2s ease-in-out infinite}.sipda-prediction-result{margin-top:22px}.sipda-prediction-result[hidden],.sipda-prediction-thinking[hidden]{display:none!important}
      .sipda-prediction-summary{padding:18px;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:18px}.sipda-prediction-summary h3{margin:0 0 8px;color:#0f172a;font-size:18px}.sipda-prediction-summary p{margin:0;color:#475569;line-height:1.56;font-size:14px}.sipda-prediction-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px}.sipda-prediction-stat{border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:14px}.sipda-prediction-stat span{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:.04em}.sipda-prediction-stat b{display:block;font-size:22px;margin-top:6px;color:#0f172a}.sipda-prediction-stat.high b{color:#dc2626}.sipda-prediction-stat.medium b{color:#d97706}.sipda-prediction-stat.low b{color:#16a34a}.sipda-prediction-block-title{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:20px 0 10px}.sipda-prediction-block-title h3{margin:0;font-size:18px;color:#0f172a}.sipda-prediction-block-title span{font-size:12px;font-weight:900;color:#64748b}.sipda-prediction-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:20px}.sipda-prediction-table{width:100%;min-width:1160px;border-collapse:collapse;background:#fff}.sipda-prediction-table th{text-align:left;padding:14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0}.sipda-prediction-table td{padding:15px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;vertical-align:top}.sipda-prediction-table tr:last-child td{border-bottom:0}.sipda-priority-pill{display:inline-flex;padding:7px 10px;border-radius:999px;font-weight:900;font-size:12px;white-space:nowrap}.sipda-priority-pill.high{background:#fef2f2;color:#dc2626}.sipda-priority-pill.medium{background:#fffbeb;color:#b45309}.sipda-priority-pill.low{background:#ecfdf3;color:#15803d}.sipda-source-pill{display:inline-flex;border-radius:999px;background:#eef6ff;color:#0054A6;font-weight:900;font-size:11px;padding:5px 8px;margin-right:6px}.sipda-prediction-proof{margin-top:8px;color:#64748b;font-size:12px;line-height:1.45}.sipda-prediction-action{font-weight:800;color:#0f3f74}.sipda-prediction-note{display:flex;gap:8px;align-items:flex-start;margin-top:14px;color:#64748b;font-size:12px;line-height:1.45}.sipda-prediction-note svg{width:16px;flex:0 0 auto;color:#0054A6}.sipda-compact-list{display:grid;gap:8px;margin-top:10px}.sipda-compact-item{border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:12px;font-size:13px;color:#334155}.sipda-compact-item b{color:#0f172a}.sipda-empty-prediction{border:1px dashed #cbd5e1;border-radius:22px;padding:22px;background:#f8fafc;color:#64748b;line-height:1.55}
      @keyframes sipdaPredIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes sipdaPredSpin{to{transform:rotate(360deg)}}@keyframes sipdaPredProgress{0%{transform:translateX(-120%);width:28%}50%{width:46%}100%{transform:translateX(360%);width:28%}}
      @media(max-width:768px){.sipda-ia-btn{right:18px;bottom:82px}.sipda-ia-panel{top:auto;bottom:0;width:100vw;height:86vh;border-radius:24px 24px 0 0;border-left:0;transform:translateY(100%)}.sipda-ia-panel.is-open{transform:translateY(0)}.sipda-prediction-modal{align-items:flex-end;padding:0}.sipda-prediction-card{width:100%;max-height:92vh;border-radius:28px 28px 0 0;padding:22px}.sipda-prediction-title h2{font-size:24px}.sipda-prediction-thinking{grid-template-columns:1fr;text-align:center}.sipda-prediction-spinner{margin:0 auto}.sipda-prediction-stats{grid-template-columns:1fr 1fr}.sipda-prediction-block-title{display:grid}}
    `;
    document.head.appendChild(style);
  }

  function createPredictionModal(){
    if(byId('sipdaPrediction48Modal')) return;
    const modal = document.createElement('section');
    modal.id = 'sipdaPrediction48Modal';
    modal.className = 'sipda-prediction-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="sipda-prediction-card" role="dialog" aria-modal="true">
        <button id="sipdaPrediction48Close" class="sipda-prediction-close" type="button" aria-label="Tancar">×</button>
        <div class="sipda-prediction-title">
          <span class="sipda-prediction-kicker">SIPDA IA</span>
          <h2>Predicció operativa 48H</h2>
          <p id="sipdaPrediction48Subtitle">Predicció dinàmica sense límit de resultats, basada en les novetats PL/ME carregades.</p>
        </div>
        <div id="sipdaPredictionThinking" class="sipda-prediction-thinking">
          <div class="sipda-prediction-spinner"></div>
          <div><strong>Processant informació operativa</strong><p id="sipdaPredictionStep">Llegint novetats de Policia Local i Mossos...</p><div class="sipda-prediction-progress"><span></span></div></div>
        </div>
        <div id="sipdaPredictionResult" class="sipda-prediction-result" hidden></div>
      </div>`;
    document.body.appendChild(modal);
    byId('sipdaPrediction48Close')?.addEventListener('click', closePredictionModal);
    modal.addEventListener('click', event => { if(event.target === modal) closePredictionModal(); });
  }
  function injectPredictionButton(){
    if(byId('sipdaPrediction48Button')) return;
    const button = document.createElement('button');
    button.id = 'sipdaPrediction48Button';
    button.className = 'btn black sipda-prediction-48-btn';
    button.type = 'button';
    button.innerHTML = '<i data-lucide="radar"></i>Predicció 48H';
    const clearButton = byId('clearHistory');
    const actions = document.querySelector('.top-actions');
    if(clearButton && clearButton.parentElement) clearButton.parentElement.insertBefore(button, clearButton);
    else if(actions) actions.appendChild(button);
    else document.body.appendChild(button);
    button.addEventListener('click', openPredictionModal);
    if(window.lucide?.createIcons) window.lucide.createIcons();
  }
  function closePredictionModal(){
    if(window.__sipdaPredictionInterval) clearInterval(window.__sipdaPredictionInterval);
    window.__sipdaPredictionInterval = null;
    const modal = byId('sipdaPrediction48Modal');
    if(modal) modal.hidden = true;
  }
  function wait(ms){ return new Promise(resolve => window.setTimeout(resolve, ms)); }
  async function openPredictionModal(){
    createPredictionModal();
    const modal = byId('sipdaPrediction48Modal');
    const thinking = byId('sipdaPredictionThinking');
    const result = byId('sipdaPredictionResult');
    const step = byId('sipdaPredictionStep');
    const subtitle = byId('sipdaPrediction48Subtitle');
    modal.hidden = false;
    thinking.hidden = false;
    result.hidden = true;
    result.innerHTML = '';
    subtitle.textContent = 'Analitzant totes les deteccions sense aplicar cap top 3, top 5 ni límit fix.';
    let i = 0;
    step.textContent = thinkingSteps[0];
    if(window.__sipdaPredictionInterval) clearInterval(window.__sipdaPredictionInterval);
    window.__sipdaPredictionInterval = window.setInterval(() => {
      i = (i + 1) % thinkingSteps.length;
      step.textContent = thinkingSteps[i];
    }, 760);
    const analysis = analyse();
    await wait(5000);
    if(window.__sipdaPredictionInterval) clearInterval(window.__sipdaPredictionInterval);
    window.__sipdaPredictionInterval = null;
    thinking.hidden = true;
    subtitle.textContent = 'Predicció generada a partir de tots els serveis detectats i classificats per risc operatiu.';
    renderPredictionResult(analysis);
  }
  function statsHtml(analysis){
    return `<div class="sipda-prediction-stats">
      <div class="sipda-prediction-stat"><span>Deteccions</span><b>${analysis.services.length}</b></div>
      <div class="sipda-prediction-stat high"><span>Prioritat alta</span><b>${analysis.groups.high.length}</b></div>
      <div class="sipda-prediction-stat medium"><span>Prioritat mitjana</span><b>${analysis.groups.medium.length}</b></div>
      <div class="sipda-prediction-stat low"><span>Prioritat baixa</span><b>${analysis.groups.low.length}</b></div>
      <div class="sipda-prediction-stat"><span>Nivell global</span><b>${esc(analysis.globalLevel)}</b></div>
    </div>`;
  }
  function rowsTable(rows){
    if(!rows.length) return '<div class="sipda-empty-prediction">No hi ha deteccions en aquest nivell de prioritat.</div>';
    return `<div class="sipda-prediction-table-wrap"><table class="sipda-prediction-table"><thead><tr><th>#</th><th>Prioritat</th><th>Què pot passar</th><th>Zona</th><th>Franja</th><th>Prob.</th><th>Impacte</th><th>Acció preventiva</th><th>Base documental</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.number}</td><td><span class="sipda-priority-pill ${priorityClass(row.priority)}">${priorityLabel(row.priority)}</span></td><td><span class="sipda-source-pill">${esc(row.source)}</span><b>${esc(row.risk)}</b><div class="sipda-prediction-proof">${esc(row.prediction)}</div></td><td>${esc(row.zone)}</td><td>${esc(row.band)}</td><td>${esc(row.probability)}</td><td>${esc(row.impact)}</td><td class="sipda-prediction-action">${esc(row.action)}</td><td>${esc(row.evidence)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function compactRows(rows, limit){
    if(!rows.length) return '<div class="sipda-empty-prediction">Sense deteccions.</div>';
    const visible = rows.slice(0, limit || 12);
    return `<div class="sipda-compact-list">${visible.map(row => `<div class="sipda-compact-item"><span class="sipda-priority-pill ${priorityClass(row.priority)}">${priorityLabel(row.priority)}</span> <b>${esc(row.risk)}</b> · ${esc(row.zone)} · ${esc(row.band)}<br><small>${esc(row.action)}</small></div>`).join('')}${rows.length > visible.length ? `<div class="sipda-compact-item"><b>+${rows.length - visible.length}</b> deteccions addicionals disponibles en dades carregades.</div>` : ''}</div>`;
  }
  function renderPredictionResult(analysis){
    const result = byId('sipdaPredictionResult');
    if(!result) return;
    if(!analysis.services.length){
      result.innerHTML = `<div class="sipda-empty-prediction"><b>No hi ha informes carregats.</b><br>Carrega primer les novetats de Policia Local i Mossos. Quan hi hagi dades, SIPDA classificarà automàticament totes les deteccions i generarà predicció 48H sense límit fix.</div>`;
      result.hidden = false;
      return;
    }
    const zones = analysis.topZones.map(z => z.key).join(' · ') || 'zones pendents de validar';
    const categories = analysis.topCategories.map(c => c.key).join(' · ') || 'tipologies pendents de validar';
    const executive = analysis.groups.high.length
      ? `SIPDA ha detectat ${analysis.groups.high.length} prioritat(s) alta(es). Totes entren a la predicció 48H. No s’ha aplicat cap límit visual tipus top 3: el comandament pot veure totes les altes i les accions preventives associades.`
      : `SIPDA no ha detectat prioritats altes en aquest conjunt, però manté predicció sobre ${analysis.groups.medium.length} mitjanes i ${analysis.groups.low.length} baixes.`;
    result.innerHTML = `
      <div class="sipda-prediction-summary"><h3>Resum predictiu</h3><p>${esc(executive)} Fonts: PL ${analysis.sourceStats.PL || 0} serveis · ME ${analysis.sourceStats.MOSSOS || 0} serveis. Zones principals: ${esc(zones)}. Tipologies dominants: ${esc(categories)}.</p></div>
      ${statsHtml(analysis)}
      <div class="sipda-prediction-block-title"><h3>Prioritats altes · predicció individualitzada 48H</h3><span>${analysis.rowsHigh.length} resultat(s), sense límit màxim</span></div>
      ${rowsTable(analysis.rowsHigh)}
      <div class="sipda-prediction-block-title"><h3>Prioritats mitjanes · seguiment preventiu</h3><span>${analysis.rowsMedium.length} resultat(s)</span></div>
      ${compactRows(analysis.rowsMedium, 14)}
      <div class="sipda-prediction-block-title"><h3>Prioritats baixes · context operatiu</h3><span>${analysis.rowsLow.length} resultat(s)</span></div>
      ${compactRows(analysis.rowsLow, 10)}
      <div class="sipda-prediction-note"><i data-lucide="shield-check"></i><span>Aquesta predicció no resumeix només el passat: utilitza les novetats documentades com a base per projectar què pot passar en les properes 48 hores i quina acció preventiva convé adoptar. El criteri final continua sent del comandament policial.</span></div>`;
    result.hidden = false;
    if(window.lucide?.createIcons) window.lucide.createIcons();
  }

  function addChatMessage(type, text){
    const body = byId('sipdaIaBody');
    if(!body) return;
    const div = document.createElement('div');
    div.className = 'sipda-ia-msg ' + type;
    div.innerHTML = type === 'bot' ? '<small>SIPDA IA</small>' + text : '<small>Consulta</small>' + esc(text);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
  function ask(label){
    addChatMessage('user', label);
    window.setTimeout(() => {
      if(label === 'Obrir Microsoft 365') window.open(agentUrl, '_blank', 'noopener,noreferrer');
      if(label === 'Predicció 48 h'){
        addChatMessage('bot','Obro la predicció operativa 48H dinàmica. Si hi ha 22 prioritats altes, veuràs les 22 amb acció preventiva.');
        openPredictionModal();
        return;
      }
      addChatMessage('bot','SIPDA IA treballa amb les novetats carregades: extreu deteccions, classifica risc alt/mitjà/baix i projecta escenaris 48H sense límit fix de resultats.');
    }, 220);
  }
  function createChatPanel(){
    if(byId('sipdaIaDemoRoot')) return;
    const root = document.createElement('div');
    root.id = 'sipdaIaDemoRoot';
    root.innerHTML = `<button id="sipdaIaBtn" class="sipda-ia-btn" type="button"><span class="sipda-ia-dot"></span>SIPDA IA</button><div id="sipdaIaOverlay" class="sipda-ia-overlay"></div><aside id="sipdaIaPanel" class="sipda-ia-panel" aria-hidden="true"><header class="sipda-ia-header"><div><strong>SIPDA IA</strong><span>Predicció operativa v7</span></div><button id="sipdaIaClose" class="sipda-ia-close" type="button">×</button></header><div class="sipda-ia-warning">Motor local de demo: no envia PDFs a cap servidor. Classifica totes les deteccions i genera predicció 48H sense top 3.</div><div id="sipdaIaBody" class="sipda-ia-body"></div><div class="sipda-ia-actions"><button class="sipda-ia-chip" type="button" data-ask="Analitza informes">Analitza informes</button><button class="sipda-ia-chip primary" type="button" data-ask="Predicció 48 h">Predicció 48 h</button><button class="sipda-ia-chip" type="button" data-ask="Zones calentes">Zones calentes</button><button class="sipda-ia-chip" type="button" data-ask="Briefing comandament">Briefing comandament</button><button class="sipda-ia-chip" type="button" data-ask="Obrir Microsoft 365">Obrir Microsoft 365</button></div><div class="sipda-ia-compose"><input id="sipdaIaInput" class="sipda-ia-input" placeholder="Escriu una consulta demo..."><button id="sipdaIaSend" class="sipda-ia-send" type="button">➜</button></div></aside>`;
    document.body.appendChild(root);
    const panel = byId('sipdaIaPanel');
    const overlay = byId('sipdaIaOverlay');
    const input = byId('sipdaIaInput');
    const openPanel = () => { panel.classList.add('is-open'); overlay.classList.add('is-open'); panel.setAttribute('aria-hidden','false'); if(!panel.dataset.started){ addChatMessage('bot','Hola. Sóc SIPDA IA v7. Quan premis Predicció 48 h, analitzaré totes les deteccions carregades sense limitar la sortida a 3 resultats.'); panel.dataset.started='true'; } };
    const closePanel = () => { panel.classList.remove('is-open'); overlay.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); };
    byId('sipdaIaBtn')?.addEventListener('click', openPanel);
    byId('sipdaIaClose')?.addEventListener('click', closePanel);
    overlay?.addEventListener('click', closePanel);
    document.querySelectorAll('.sipda-ia-chip').forEach(btn => btn.addEventListener('click', () => ask(btn.dataset.ask)));
    byId('sipdaIaSend')?.addEventListener('click', () => { const value = input.value.trim(); if(!value) return; input.value=''; ask(value); });
    input?.addEventListener('keydown', e => { if(e.key === 'Enter') byId('sipdaIaSend')?.click(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') { closePanel(); closePredictionModal(); } });
  }
  function init(){
    addStyle();
    createChatPanel();
    createPredictionModal();
    injectPredictionButton();
    window.SIPDA_PREDICCIO_DINAMICA = {build: BUILD, analyse, open: openPredictionModal};
  }
  document.addEventListener('DOMContentLoaded', init);
})();
