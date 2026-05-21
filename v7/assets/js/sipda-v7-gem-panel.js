/* SIPDA v7 · Gemini Gem floating launcher */
(function(){
  const GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  const BUILD='sipda-v7-gem-launcher-no-iframe-2026-05-22';

  function style(){
    if(document.getElementById('sipdaGemPanelStyle')) return;
    const css=document.createElement('style');
    css.id='sipdaGemPanelStyle';
    css.textContent=`
      .is-locked #sipdaGemFloatButton{display:none!important}
      #sipdaGemFloatButton{position:fixed;right:22px;bottom:92px;z-index:9990;min-width:168px;height:48px;border:1px solid rgba(0,84,166,.28);background:#0054A6;color:#fff;border-radius:999px;box-shadow:0 18px 42px rgba(0,84,166,.28),0 8px 18px rgba(16,24,40,.12);display:flex;align-items:center;justify-content:center;gap:9px;padding:0 18px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
      #sipdaGemFloatButton:hover{transform:translateY(-2px);box-shadow:0 22px 52px rgba(0,84,166,.34),0 10px 22px rgba(16,24,40,.14)}
      #sipdaGemFloatButton svg{width:18px;height:18px;stroke-width:2.6}
      #sipdaGemPanelBackdrop{position:fixed;inset:0;z-index:9991;background:rgba(15,23,42,.22);backdrop-filter:blur(8px);display:none}
      #sipdaGemPanelBackdrop.open{display:block}
      #sipdaGemPanel{position:fixed;top:18px;right:18px;bottom:18px;width:min(520px,calc(100vw - 28px));z-index:9992;background:#fff;border:1px solid #e4e7ec;border-radius:26px;box-shadow:0 28px 80px rgba(16,24,40,.22);overflow:hidden;transform:translateX(calc(100% + 30px));transition:transform .26s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;font-family:Inter,Arial,sans-serif}
      #sipdaGemPanel.open{transform:translateX(0)}
      .sipda-gem-head{min-height:76px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 18px 16px 20px;border-bottom:1px solid #eef2f7;background:linear-gradient(180deg,#fff,#f8fbff)}
      .sipda-gem-title{display:flex;align-items:center;gap:12px;min-width:0}.sipda-gem-mark{width:42px;height:42px;border-radius:16px;background:#0054A6;color:#fff;display:grid;place-items:center;font-weight:950;box-shadow:0 10px 24px rgba(0,84,166,.22)}
      .sipda-gem-title strong{display:block;font-size:16px;letter-spacing:-.02em;color:#101828}.sipda-gem-title span{display:block;margin-top:3px;font-size:12px;color:#667085;font-weight:700}
      .sipda-gem-close{width:40px;height:40px;border-radius:999px;border:1px solid #e4e7ec;background:#fff;display:grid;place-items:center;cursor:pointer;color:#101828}
      .sipda-gem-body{padding:16px;display:flex;flex-direction:column;gap:12px;min-height:0;flex:1;background:#f8fafc}.sipda-gem-note{padding:13px 14px;border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;color:#1e3a8a;font-size:12px;font-weight:750;line-height:1.45}
      .sipda-gem-actions{display:grid;grid-template-columns:1fr;gap:10px}.sipda-gem-action{height:46px;border-radius:14px;border:1px solid #e4e7ec;background:#fff;color:#101828;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;cursor:pointer}.sipda-gem-action.primary{background:#101828;color:#fff;border-color:#101828}
      .sipda-gem-card{border:1px solid #e4e7ec;background:#fff;border-radius:20px;padding:18px;box-shadow:0 10px 28px rgba(16,24,40,.05)}.sipda-gem-card h3{margin:0 0 8px;font-size:17px;letter-spacing:-.03em;color:#101828}.sipda-gem-card p{margin:0;color:#667085;font-size:12px;line-height:1.55;font-weight:700}.sipda-gem-list{display:grid;gap:8px;margin-top:14px}.sipda-gem-list span{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#344054;font-weight:800}.sipda-gem-list i{width:8px;height:8px;border-radius:50%;background:#0054A6;flex:0 0 auto;margin-top:5px}
      .sipda-gem-status{margin-top:auto;padding:12px 14px;border:1px dashed #cbd5e1;background:#fff;border-radius:16px;color:#475467;font-size:12px;line-height:1.45;font-weight:750}
      @media(max-width:760px){#sipdaGemFloatButton{right:14px;bottom:82px;min-width:54px;width:54px;padding:0;border-radius:20px}#sipdaGemFloatButton span{display:none}#sipdaGemPanel{top:auto;right:0;left:0;bottom:0;width:100%;height:72vh;border-radius:28px 28px 0 0;transform:translateY(calc(100% + 20px))}#sipdaGemPanel.open{transform:translateY(0)}}
    `;
    document.head.appendChild(css);
  }

  function mount(){
    style();
    if(!document.getElementById('sipdaGemPanelBackdrop')){
      const backdrop=document.createElement('div');
      backdrop.id='sipdaGemPanelBackdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click',close);
    }
    if(!document.getElementById('sipdaGemPanel')){
      const panel=document.createElement('aside');
      panel.id='sipdaGemPanel';
      panel.setAttribute('aria-label','Gemini SIPDA');
      panel.innerHTML=`
        <header class="sipda-gem-head">
          <div class="sipda-gem-title"><div class="sipda-gem-mark">G</div><div><strong>Gem SIPDA</strong><span>Assistent Gemini vinculat</span></div></div>
          <button id="sipdaGemClose" class="sipda-gem-close" type="button" aria-label="Tancar"><i data-lucide="x"></i></button>
        </header>
        <div class="sipda-gem-body">
          <div class="sipda-gem-note">Gemini bloqueja la visualització integrada per iframe. SIPDA obrirà el Gem en una finestra/pestanya externa segura.</div>
          <div class="sipda-gem-actions">
            <button id="sipdaGemOpenWindow" class="sipda-gem-action primary" type="button"><i data-lucide="external-link"></i>Obrir Gem SIPDA</button>
            <a class="sipda-gem-action" href="${GEM_URL}" target="_blank" rel="noopener noreferrer"><i data-lucide="send"></i>Obrir en pestanya nova</a>
          </div>
          <div class="sipda-gem-card">
            <h3>Agent extern vinculat</h3>
            <p>Aquest panel manté SIPDA net i obre el Gem quan calgui interactuar directament amb Gemini.</p>
            <div class="sipda-gem-list"><span><i></i>Consulta el Gem sense exposar claus dins del frontend.</span><span><i></i>Útil per preguntes manuals, revisió del raonament i suport al comandament.</span><span><i></i>La predicció automàtica 48H continua funcionant amb l'endpoint intern de SIPDA.</span></div>
          </div>
          <div class="sipda-gem-status">Estat: iframe desactivat voluntàriament per evitar bloquejos de Google.</div>
        </div>`;
      document.body.appendChild(panel);
      document.getElementById('sipdaGemClose')?.addEventListener('click',close);
      document.getElementById('sipdaGemOpenWindow')?.addEventListener('click',openGemWindow);
    }
    if(!document.getElementById('sipdaGemFloatButton')){
      const btn=document.createElement('button');
      btn.id='sipdaGemFloatButton';
      btn.type='button';
      btn.innerHTML='<i data-lucide="sparkles"></i><span>Gem SIPDA</span>';
      btn.addEventListener('click',open);
      document.body.appendChild(btn);
    }
    if(window.lucide?.createIcons) window.lucide.createIcons();
    window.SIPDA_GEM_PANEL={build:BUILD,url:GEM_URL,open,close,openGemWindow};
  }

  function openGemWindow(){
    const w=Math.min(1180,screen.width-80);
    const h=Math.min(860,screen.height-80);
    const left=Math.round((screen.width-w)/2);
    const top=Math.round((screen.height-h)/2);
    const win=window.open(GEM_URL,'sipda_gemini_gem','popup=yes,width='+w+',height='+h+',left='+left+',top='+top+',noopener,noreferrer');
    if(!win) window.open(GEM_URL,'_blank','noopener,noreferrer');
  }

  function open(){document.getElementById('sipdaGemPanelBackdrop')?.classList.add('open');document.getElementById('sipdaGemPanel')?.classList.add('open')}
  function close(){document.getElementById('sipdaGemPanelBackdrop')?.classList.remove('open');document.getElementById('sipdaGemPanel')?.classList.remove('open')}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);else mount();
})();
