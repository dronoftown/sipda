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
      .is-locked .sipda-ia-btn{display:none!important}
      .sipda-ia-btn{position:fixed;right:24px;bottom:24px;z-index:9000;display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;background:#0054A6;color:#fff;font-weight:800;font-size:14px;box-shadow:0 18px 40px rgba(0,84,166,.28);cursor:pointer}
      .sipda-ia-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18)}
      .sipda-ia-panel{position:fixed;top:0;right:0;z-index:9999;width:min(460px,100vw);height:100vh;background:#fff;border-left:1px solid #e5e7eb;box-shadow:-24px 0 70px rgba(15,23,42,.18);transform:translateX(100%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif}
      .sipda-ia-panel.is-open{transform:translateX(0)}
      .sipda-ia-header{height:72px;padding:16px 18px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;justify-content:space-between;background:#fff}
      .sipda-ia-header strong{display:block;font-size:16px;color:#101828;letter-spacing:-.02em}.sipda-ia-header span{display:block;margin-top:2px;font-size:12px;color:#667085}.sipda-ia-close{width:38px;height:38px;border:0;border-radius:12px;background:#f2f4f7;color:#101828;font-size:24px;cursor:pointer}
      .sipda-ia-warning{padding:10px 18px;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fed7aa;font-size:12px;font-weight:700;line-height:1.35}
      .sipda-ia-body{flex:1;min-height:0;overflow:auto;background:#f8fafc;padding:18px;display:flex;flex-direction:column;gap:12px}.sipda-ia-msg{max-width:88%;padding:12px 14px;border-radius:18px;font-size:13px;line-height:1.45;box-shadow:0 10px 28px rgba(15,23,42,.06)}.sipda-ia-msg.bot{align-self:flex-start;background:#fff;color:#344054;border:1px solid #eef2f7}.sipda-ia-msg.user{align-self:flex-end;background:#0054A6;color:#fff}.sipda-ia-msg small{display:block;margin-bottom:5px;font-size:11px;font-weight:800;color:#0054A6}.sipda-ia-msg.user small{color:#dbeafe}.sipda-ia-actions{padding:12px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:8px;flex-wrap:wrap}.sipda-ia-chip{border:1px solid #d0d5dd;border-radius:999px;background:#fff;color:#344054;padding:9px 12px;font-weight:700;font-size:12px;cursor:pointer}.sipda-ia-chip.primary{background:#0054A6;color:#fff;border-color:#0054A6}.sipda-ia-compose{padding:14px 18px 18px;border-top:1px solid #eef2f7;background:#fff;display:flex;gap:10px}.sipda-ia-input{flex:1;height:42px;border:1px solid #d0d5dd;border-radius:14px;padding:0 12px;font-size:13px}.sipda-ia-send{width:46px;border:0;border-radius:14px;background:#0054A6;color:#fff;font-weight:900;cursor:pointer}.sipda-ia-overlay{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.26);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .24s ease}.sipda-ia-overlay.is-open{opacity:1;pointer-events:auto}
      @media(max-width:768px){.sipda-ia-btn{right:18px;bottom:82px}.sipda-ia-panel{top:auto;bottom:0;width:100vw;height:86vh;border-radius:24px 24px 0 0;border-left:0;transform:translateY(100%)}.sipda-ia-panel.is-open{transform:translateY(0)}}
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

  function init(){
    if(document.getElementById('sipdaIaDemoRoot')) return;
    addStyle();

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
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closePanel(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
