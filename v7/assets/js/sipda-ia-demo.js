(function(){
  const agentUrl = 'https://m365.cloud.microsoft/chat/';

  const demoAnswers = {
    'Analitza informes': 'Lectura demo: SIPDA IA revisaria els informes carregats de Policia Local i Mossos, separant fets documentats, zones, franges horàries i tipologies de servei. Per a dades reals cal connectar l’agent Copilot Studio publicable o backend IA segur.',
    'Predicció 48 h': 'Predicció demo: el sistema generaria una matriu de risc per zona, franja, probabilitat, impacte i acció recomanada. Aquesta predicció ha de sortir sempre de novetats carregades, no de serveis planificats.',
    'Zones calentes': 'Zones calentes demo: SIPDA IA agruparia incidències per recurrència territorial, prioritat i franja horària. Les zones només serien informades si hi ha base documental suficient.',
    'Briefing comandament': 'Briefing demo: es prepararia una lectura executiva breu per al comandament amb patró principal, riscos 24/48 h, recomanació operativa i limitacions de l’anàlisi.',
    'Obrir Microsoft 365': 'Obrint Microsoft 365 Copilot en una pestanya nova. Si el teu agent SIPDA IA està ancorat, selecciona’l al lateral.'
  };

  function addStyle(){
    if(document.getElementById('sipda-ia-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'sipda-ia-demo-style';
    style.textContent = `
      .is-locked .sipda-ia-btn,.is-locked .sipda-prediction-48-btn{display:none!important}
      .sipda-ia-btn{position:fixed;right:24px;bottom:24px;z-index:9000;display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;background:#0054A6;color:#fff;font-weight:800;font-size:14px;box-shadow:0 18px 40px rgba(0,84,166,.28);cursor:pointer}
      .sipda-ia-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18)}
      .sipda-ia-panel{position:fixed;top:0;right:0;z-index:9999;width:min(460px,100vw);height:100vh;background:#fff;border-left:1px solid #e5e7eb;box-shadow:-24px 0 70px rgba(15,23,42,.18);transform:translateX(100%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif}
      .sipda-ia-panel.is-open{transform:translateX(0)}
      .sipda-ia-header{height:72px;padding:16px 18px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;justify-content:space-between;background:#fff}
      .sipda-ia-header strong{display:block;font-size:16px;color:#101828;letter-spacing:-.02em}.sipda-ia-header span{display:block;margin-top:2px;font-size:12px;color:#667085}.sipda-ia-close{width:38px;height:38px;border:0;border-radius:12px;background:#f2f4f7;color:#101828;font-size:24px;cursor:pointer}
      .sipda-ia-warning{padding:10px 18px;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fed7aa;font-size:12px;font-weight:700;line-height:1.35}
      .sipda-ia-body{flex:1;min-height:0;overflow:auto;background:#f8fafc;padding:18px;display:flex;flex-direction:column;gap:12px}.sipda-ia-msg{max-width:88%;padding:12px 14px;border-radius:18px;font-size:13px;line-height:1.45;box-shadow:0 10px 28px rgba(15,23,42,.06)}.sipda-ia-msg.bot{align-self:flex-start;background:#fff;color:#344054;border:1px solid #eef2f7}.sipda-ia-msg.user{align-self:flex-end;background:#0054A6;color:#fff}.sipda-ia-msg small{display:block;margin-bottom:5px;font-size:11px;font-weight:800;color:#0054A6}.sipda-ia-msg.user small{color:#dbeafe}.sipda-ia-actions{padding:12px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:8px;flex-wrap:wrap}.sipda-ia-chip{border:1px solid #d0d5dd;border-radius:999px;background:#fff;color:#344054;padding:9px 12px;font-weight:700;font-size:12px;cursor:pointer}.sipda-ia-chip.primary{background:#0054A6;color:#fff;border-color:#0054A6}.sipda-ia-compose{padding:14px 18px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:10px}.sipda-ia-input{flex:1;height:42px;border:1px solid #d0d5dd;border-radius:14px;padding:0 12px;font-size:13px}.sipda-ia-send{width:46px;border:0;border-radius:14px;background:#0054A6;color:#fff;font-weight:900;cursor:pointer}.sipda-ia-overlay{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.26);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .24s ease}.sipda-ia-overlay.is-open{opacity:1;pointer-events:auto}
      .sipda-prediction-48-btn{background:#08111f!important;color:#fff!important;border-color:#08111f!important;box-shadow:0 14px 32px rgba(8,17,31,.18)}
      .sipda-prediction-modal{position:fixed;inset:0;z-index:10020;background:rgba(15,23,42,.50);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif}
      .sipda-prediction-modal[hidden]{display:none!important}
      .sipda-prediction-card{position:relative;width:min(1040px,96vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid rgba(255,255,255,.78);border-radius:30px;box-shadow:0 34px 95px rgba(15,23,42,.34);padding:28px;animation:sipdaPredIn .26s ease}
      .sipda-prediction-close{position:absolute;top:18px;right:18px;width:40px;height:40px;border:0;border-radius:999px;background:#f1f5f9;color:#0f172a;font-size:25px;line-height:1;cursor:pointer}
      .sipda-prediction-kicker{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#eef6ff;color:#0054A6;padding:7px 11px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px}.sipda-prediction-kicker:before{content:"";width:8px;height:8px;border-radius:999px;background:#38bdf8;box-shadow:0 0 0 5px rgba(56,189,248,.14)}
      .sipda-prediction-title{padding-right:54px}.sipda-prediction-title h2{margin:0;font-size:30px;line-height:1.08;color:#0f172a;letter-spacing:-.04em}.sipda-prediction-title p{margin:10px 0 0;color:#64748b;font-size:14px;line-height:1.45}
      .sipda-prediction-thinking{display:grid;grid-template-columns:64px 1fr;gap:18px;align-items:center;margin-top:22px;padding:22px;border:1px solid #e2e8f0;border-radius:24px;background:linear-gradient(180deg,#fff,#f8fafc)}
      .sipda-prediction-spinner{width:56px;height:56px;border-radius:999px;border:4px solid #e2e8f0;border-top-color:#0054A6;animation:sipdaPredSpin .82s linear infinite}.sipda-prediction-thinking strong{display:block;color:#0f172a;font-size:16px;margin-bottom:6px}.sipda-prediction-thinking p{margin:0;color:#64748b;font-size:14px}.sipda-prediction-progress{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:14px}.sipda-prediction-progress span{display:block;height:100%;width:32%;border-radius:999px;background:linear-gradient(90deg,#0054A6,#38bdf8);animation:sipdaPredProgress 1.2s ease-in-out infinite}
      .sipda-prediction-result{margin-top:22px}.sipda-prediction-result[hidden],.sipda-prediction-thinking[hidden]{display:none!important}.sipda-prediction-summary{padding:18px;border-radius:22px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:18px}.sipda-prediction-summary h3{margin:0 0 8px;color:#0f172a;font-size:18px}.sipda-prediction-summary p{margin:0;color:#475569;line-height:1.56;font-size:14px}
      .sipda-prediction-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.sipda-prediction-stat{border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:14px}.sipda-prediction-stat span{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:900;letter-spacing:.04em}.sipda-prediction-stat b{display:block;font-size:22px;margin-top:6px;color:#0f172a}
      .sipda-prediction-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:20px}.sipda-prediction-table{width:100%;min-width:820px;border-collapse:collapse;background:#fff}.sipda-prediction-table th{text-align:left;padding:14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0}.sipda-prediction-table td{padding:15px 14px;font-size:13px;color:#0f172a;border-bottom:1px solid #f1f5f9;vertical-align:top}.sipda-prediction-table tr:last-child td{border-bottom:0}.sipda-prediction-risk{display:inline-flex;padding:7px 10px;border-radius:999px;font-weight:900;font-size:12px;background:#fff7ed;color:#c2410c;white-space:nowrap}.sipda-prediction-risk.high{background:#fef2f2;color:#dc2626}.sipda-prediction-risk.low{background:#ecfdf3;color:#15803d}.sipda-prediction-proof{margin-top:8px;color:#64748b;font-size:12px;line-height:1.45}.sipda-prediction-note{display:flex;gap:8px;align-items:flex-start;margin-top:14px;color:#64748b;font-size:12px;line-height:1.45}.sipda-prediction-note svg{width:16px;flex:0 0 auto;color:#0054A6}
      @keyframes sipdaPredIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes sipdaPredSpin{to{transform:rotate(360deg)}}@keyframes sipdaPredProgress{0%{transform:translateX(-120%);width:28%}50%{width:46%}100%{transform:translateX(360%);width:28%}}
      @media(max-width:768px){.sipda-ia-btn{right:18px;bottom:82px}.sipda-ia-panel{top:auto;bottom:0;width:100vw;height:86vh;border-radius:24px 24px 0 0;border-left:0;transform:translateY(100%)}.sipda-ia-panel.is-open{transform:translateY(0)}.sipda-prediction-modal{align-items:flex-end;padding:0}.sipda-prediction-card{width:100%;max-height:92vh;border-radius:28px 28px 0 0;padding:22px}.sipda-prediction-title h2{font-size:24px}.sipda-prediction-thinking{grid-template-columns:1fr;text-align:center}.sipda-prediction-spinner{margin:0 auto}.sipda-prediction-stats{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function addMessage(type, text){
    const body = document.getElementById('sipdaIaBody');
    if(!body) return;
    const div = document.createElement('div');
    div.className = 'sipda-ia-msg ' + type;
    div.innerHTML = type === 'bot' ? '<small>SIPDA IA</small>' + text : '<small>Consulta</small>' + text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function ask(label){
    addMessage('user', label);
    window.setTimeout(() => {
      if(label === 'Obrir Microsoft 365') window.open(agentUrl, '_blank', 'noopener,noreferrer');
      addMessage('bot', demoAnswers[label] || 'Resposta demo: SIPDA IA transformaria les novetats carregades en lectura executiva, patró, risc 48 h i recomanació operativa, sempre amb validació del comandament.');
    }, 240);
  }

  function createChatPanel(){
    if(document.getElementById('sipdaIaDemoRoot')) return;
    const root = document.createElement('div');
    root.id = 'sipdaIaDemoRoot';
    root.innerHTML = `
      <button id="sipdaIaBtn" class="sipda-ia-btn" type="button" aria-label="Obrir SIPDA IA"><span class="sipda-ia-dot"></span>SIPDA IA</button>
      <div id="sipdaIaOverlay" class="sipda-ia-overlay"></div>
      <aside id="sipdaIaPanel" class="sipda-ia-panel" aria-hidden="true">
        <header class="sipda-ia-header"><div><strong>SIPDA IA</strong><span>Agent demo d’intel·ligència operativa</span></div><button id="sipdaIaClose" class="sipda-ia-close" type="button" aria-label="Tancar">×</button></header>
        <div class="sipda-ia-warning">Demo visual dins de SIPDA. El teu agent Microsoft 365 actual no dona iframe web directe. No utilitzar dades reals.</div>
        <div id="sipdaIaBody" class="sipda-ia-body"></div>
        <div class="sipda-ia-actions"><button class="sipda-ia-chip" type="button" data-ask="Analitza informes">Analitza informes</button><button class="sipda-ia-chip" type="button" data-ask="Predicció 48 h">Predicció 48 h</button><button class="sipda-ia-chip" type="button" data-ask="Zones calentes">Zones calentes</button><button class="sipda-ia-chip" type="button" data-ask="Briefing comandament">Briefing comandament</button><button class="sipda-ia-chip primary" type="button" data-ask="Obrir Microsoft 365">Obrir Microsoft 365</button></div>
        <div class="sipda-ia-compose"><input id="sipdaIaInput" class="sipda-ia-input" placeholder="Escriu una consulta demo..."><button id="sipdaIaSend" class="sipda-ia-send" type="button">➜</button></div>
      </aside>
    `;
    document.body.appendChild(root);

    const panel = document.getElementById('sipdaIaPanel');
    const overlay = document.getElementById('sipdaIaOverlay');
    const input = document.getElementById('sipdaIaInput');
    const openPanel = () => { panel.classList.add('is-open'); overlay.classList.add('is-open'); panel.setAttribute('aria-hidden','false'); if(!panel.dataset.started){addMessage('bot','Hola. Sóc SIPDA IA en mode demo. Puc mostrar com quedaria el xat operatiu dins de SIPDA i obrir Microsoft 365 Copilot si vols provar l’agent real.'); panel.dataset.started='true';} };
    const closePanel = () => { panel.classList.remove('is-open'); overlay.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); };

    document.getElementById('sipdaIaBtn')?.addEventListener('click', openPanel);
    document.getElementById('sipdaIaClose')?.addEventListener('click', closePanel);
    overlay?.addEventListener('click', closePanel);
    document.querySelectorAll('.sipda-ia-chip').forEach(btn => btn.addEventListener('click', () => ask(btn.dataset.ask)));
    document.getElementById('sipdaIaSend')?.addEventListener('click', () => { const value = input.value.trim(); if(!value) return; input.value=''; ask(value); });
    input?.addEventListener('keydown', e => { if(e.key === 'Enter') document.getElementById('sipdaIaSend')?.click(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') { closePanel(); closePredictionModal(); } });
  }

  const predictionSteps = [
    'Analitzant novetats policials carregades...',
    'Extraient serveis reals dels torns...',
    'Detectant recurrències per zona...',
    'Creuant franges horàries i prioritats...',
    'Calculant risc operatiu 48H...',
    'Generant matriu predictiva per comandament...'
  ];

  let predictionInterval = null;

  function escHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getPredictionModel(){
    if(window.SIPDA_FORECAST_48H && typeof window.SIPDA_FORECAST_48H.model === 'function') return window.SIPDA_FORECAST_48H.model();
    return {total:0,high:0,medium:0,low:0,riskScore:0,level:'pendent',zones:[],cats:[],band:'sense franja',confidence:'baixa',error:'±25%',quality:'pendent',action:'Carrega informes PDF per activar la predicció 48H.',reading:'Carrega informes PDF per activar la predicció policial 48H.'};
  }

  function probabilityFromScore(score, fallback){
    if(score >= 18 || fallback >= 75) return 'Alta';
    if(score >= 10 || fallback >= 50) return 'Mitjana-alta';
    if(score >= 6 || fallback >= 30) return 'Mitjana';
    return 'Baixa';
  }

  function impactFromLevel(level){
    if(String(level).includes('alt')) return 'Alt';
    if(String(level).includes('moderat')) return 'Mitjà';
    return 'Baix';
  }

  function buildPredictionRows(model){
    const zones = Array.isArray(model.zones) ? model.zones : [];
    const cats = Array.isArray(model.cats) ? model.cats : [];
    const mainCat = cats[0]?.name || 'Pressió operativa';
    if(!model.total){
      return [{risk:'Dades insuficients', zone:'No determinada', band:'Pendent de novetats', probability:'Baixa', impact:'Baix', action:'Carregar o afegir informes policials a l’històric abans de generar una lectura 48H.', proof:'No hi ha serveis operatius suficients carregats per calcular una predicció documental.'}];
    }
    const rows = zones.slice(0,3).map((z, index) => ({
      risk: index === 0 ? mainCat : (cats[index]?.name || 'Recurrència territorial'),
      zone: z.name || 'Zona no determinada',
      band: model.band || 'franja no determinada',
      probability: probabilityFromScore(z.score || 0, model.riskScore || 0),
      impact: impactFromLevel(model.level || ''),
      action: index === 0 ? model.action : 'Mantenir vigilància preventiva i actualitzar la lectura amb les properes novetats del torn.',
      proof: `Base documental: ${z.count || 0} serveis agrupats en aquesta zona. Puntuació operativa aproximada: ${z.score || 0}.`
    }));
    if(!rows.length){
      rows.push({risk:mainCat, zone:'Zones no determinades', band:model.band || 'franja no determinada', probability:probabilityFromScore(0, model.riskScore || 0), impact:impactFromLevel(model.level || ''), action:model.action, proof:`Base documental: ${model.total} serveis extrets dels informes carregats.`});
    }
    return rows;
  }

  function createPredictionModal(){
    if(document.getElementById('sipdaPrediction48Modal')) return;
    const modal = document.createElement('section');
    modal.id = 'sipdaPrediction48Modal';
    modal.className = 'sipda-prediction-modal';
    modal.hidden = true;
    modal.setAttribute('aria-label','Predicció operativa 48H');
    modal.innerHTML = `
      <div class="sipda-prediction-card" role="dialog" aria-modal="true">
        <button id="sipdaPrediction48Close" class="sipda-prediction-close" type="button" aria-label="Tancar">×</button>
        <div class="sipda-prediction-title">
          <span class="sipda-prediction-kicker">SIPDA IA</span>
          <h2>Predicció operativa 48H</h2>
          <p id="sipdaPrediction48Subtitle">Preparant la lectura predictiva a partir de les novetats policials carregades.</p>
        </div>
        <div id="sipdaPredictionThinking" class="sipda-prediction-thinking">
          <div class="sipda-prediction-spinner"></div>
          <div><strong>Processant informació operativa</strong><p id="sipdaPredictionStep">Analitzant novetats policials carregades...</p><div class="sipda-prediction-progress"><span></span></div></div>
        </div>
        <div id="sipdaPredictionResult" class="sipda-prediction-result" hidden></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('sipdaPrediction48Close')?.addEventListener('click', closePredictionModal);
    modal.addEventListener('click', event => { if(event.target === modal) closePredictionModal(); });
  }

  function injectPredictionButton(){
    if(document.getElementById('sipdaPrediction48Button')) return;
    const button = document.createElement('button');
    button.id = 'sipdaPrediction48Button';
    button.className = 'btn black sipda-prediction-48-btn';
    button.type = 'button';
    button.innerHTML = '<i data-lucide="radar"></i>Predicció 48H';
    const clearButton = document.getElementById('clearHistory');
    const actions = document.querySelector('.top-actions');
    if(clearButton && clearButton.parentElement) clearButton.parentElement.insertBefore(button, clearButton);
    else if(actions) actions.appendChild(button);
    else document.body.appendChild(button);
    button.addEventListener('click', openPredictionModal);
    if(window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function closePredictionModal(){
    const modal = document.getElementById('sipdaPrediction48Modal');
    if(predictionInterval) clearInterval(predictionInterval);
    predictionInterval = null;
    if(modal) modal.hidden = true;
  }

  function wait(ms){return new Promise(resolve => window.setTimeout(resolve, ms));}

  async function openPredictionModal(){
    createPredictionModal();
    const modal = document.getElementById('sipdaPrediction48Modal');
    const thinking = document.getElementById('sipdaPredictionThinking');
    const result = document.getElementById('sipdaPredictionResult');
    const step = document.getElementById('sipdaPredictionStep');
    const subtitle = document.getElementById('sipdaPrediction48Subtitle');
    modal.hidden = false;
    thinking.hidden = false;
    result.hidden = true;
    result.innerHTML = '';
    subtitle.textContent = 'Analitzant les novetats policials carregades i el patró 48H del municipi.';
    step.textContent = predictionSteps[0];
    let index = 0;
    if(predictionInterval) clearInterval(predictionInterval);
    predictionInterval = window.setInterval(() => {
      index = (index + 1) % predictionSteps.length;
      step.textContent = predictionSteps[index];
    }, 850);
    const started = Date.now();
    const model = getPredictionModel();
    const elapsed = Date.now() - started;
    if(elapsed < 5000) await wait(5000 - elapsed);
    if(predictionInterval) clearInterval(predictionInterval);
    predictionInterval = null;
    thinking.hidden = true;
    subtitle.textContent = 'Predicció generada a partir dels serveis i incidències detectats als informes carregats.';
    renderPredictionResult(model);
  }

  function renderPredictionResult(model){
    const result = document.getElementById('sipdaPredictionResult');
    if(!result) return;
    const rows = buildPredictionRows(model);
    const riskClass = (model.riskScore || 0) >= 75 ? 'high' : (model.riskScore || 0) < 30 ? 'low' : '';
    result.innerHTML = `
      <div class="sipda-prediction-summary">
        <h3>Resum executiu</h3>
        <p>${escHtml(model.reading || 'Predicció generada amb les dades disponibles a SIPDA.')}</p>
      </div>
      <div class="sipda-prediction-stats">
        <div class="sipda-prediction-stat"><span>Serveis base</span><b>${escHtml(model.total || 0)}</b></div>
        <div class="sipda-prediction-stat"><span>Risc global</span><b>${escHtml(model.riskScore || 0)}</b></div>
        <div class="sipda-prediction-stat"><span>Fiabilitat</span><b>${escHtml(model.confidence || 'baixa')}</b></div>
        <div class="sipda-prediction-stat"><span>Marge</span><b>${escHtml(model.error || '±25%')}</b></div>
      </div>
      <div class="sipda-prediction-table-wrap">
        <table class="sipda-prediction-table">
          <thead><tr><th>Risc</th><th>Zona</th><th>Franja</th><th>Probabilitat</th><th>Impacte</th><th>Acció recomanada</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td><span class="sipda-prediction-risk ${riskClass}">${escHtml(row.risk)}</span><div class="sipda-prediction-proof">${escHtml(row.proof)}</div></td><td>${escHtml(row.zone)}</td><td>${escHtml(row.band)}</td><td>${escHtml(row.probability)}</td><td>${escHtml(row.impact)}</td><td>${escHtml(row.action)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="sipda-prediction-note"><i data-lucide="shield-check"></i><span>Aquesta lectura 48H es calcula sobre serveis i incidències documentades als informes carregats. No correspon a serveis planificats ni substitueix el criteri del comandament.</span></div>
    `;
    result.hidden = false;
    if(window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  function init(){
    addStyle();
    createChatPanel();
    createPredictionModal();
    injectPredictionButton();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
