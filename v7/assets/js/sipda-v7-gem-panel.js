/* SIPDA v7 · Gemini Gem floating panel */
(function(){
  const GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  const BUILD='sipda-v7-gem-panel-2026-05-22';

  function style(){
    if(document.getElementById('sipdaGemPanelStyle')) return;
    const css=document.createElement('style');
    css.id='sipdaGemPanelStyle';
    css.textContent=`
      .is-locked #sipdaGemFloatButton{display:none!important}
      #sipdaGemFloatButton{
        position:fixed;
        right:22px;
        bottom:92px;
        z-index:9990;
        min-width:168px;
        height:48px;
        border:1px solid rgba(0,84,166,.28);
        background:#0054A6;
        color:#fff;
        border-radius:999px;
        box-shadow:0 18px 42px rgba(0,84,166,.28),0 8px 18px rgba(16,24,40,.12);
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        padding:0 18px;
        font-family:Inter,Arial,sans-serif;
        font-size:12px;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.03em;
        cursor:pointer;
        transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
      }
      #sipdaGemFloatButton:hover{transform:translateY(-2px);box-shadow:0 22px 52px rgba(0,84,166,.34),0 10px 22px rgba(16,24,40,.14)}
      #sipdaGemFloatButton svg{width:18px;height:18px;stroke-width:2.6}
      #sipdaGemPanelBackdrop{
        position:fixed;
        inset:0;
        z-index:9991;
        background:rgba(15,23,42,.22);
        backdrop-filter:blur(8px);
        display:none;
      }
      #sipdaGemPanelBackdrop.open{display:block}
      #sipdaGemPanel{
        position:fixed;
        top:18px;
        right:18px;
        bottom:18px;
        width:min(520px,calc(100vw - 28px));
        z-index:9992;
        background:#fff;
        border:1px solid #e4e7ec;
        border-radius:26px;
        box-shadow:0 28px 80px rgba(16,24,40,.22);
        overflow:hidden;
        transform:translateX(calc(100% + 30px));
        transition:transform .26s cubic-bezier(.2,.8,.2,1);
        display:flex;
        flex-direction:column;
        font-family:Inter,Arial,sans-serif;
      }
      #sipdaGemPanel.open{transform:translateX(0)}
      .sipda-gem-head{
        min-height:76px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        padding:18px 18px 16px 20px;
        border-bottom:1px solid #eef2f7;
        background:linear-gradient(180deg,#fff,#f8fbff);
      }
      .sipda-gem-title{display:flex;align-items:center;gap:12px;min-width:0}
      .sipda-gem-mark{width:42px;height:42px;border-radius:16px;background:#0054A6;color:#fff;display:grid;place-items:center;font-weight:950;box-shadow:0 10px 24px rgba(0,84,166,.22)}
      .sipda-gem-title strong{display:block;font-size:16px;letter-spacing:-.02em;color:#101828}
      .sipda-gem-title span{display:block;margin-top:3px;font-size:12px;color:#667085;font-weight:700}
      .sipda-gem-close{width:40px;height:40px;border-radius:999px;border:1px solid #e4e7ec;background:#fff;display:grid;place-items:center;cursor:pointer;color:#101828}
      .sipda-gem-body{padding:16px;display:flex;flex-direction:column;gap:12px;min-height:0;flex:1;background:#f8fafc}
      .sipda-gem-note{padding:13px 14px;border:1px solid #dbeafe;background:#eff6ff;border-radius:16px;color:#1e3a8a;font-size:12px;font-weight:750;line-height:1.45}
      .sipda-gem-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .sipda-gem-action{height:42px;border-radius:14px;border:1px solid #e4e7ec;background:#fff;color:#101828;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;cursor:pointer}
      .sipda-gem-action.primary{background:#101828;color:#fff;border-color:#101828}
      .sipda-gem-frame-wrap{position:relative;flex:1;min-height:320px;border:1px solid #e4e7ec;border-radius:18px;background:#fff;overflow:hidden}
      .sipda-gem-frame{width:100%;height:100%;border:0;background:#fff}
      .sipda-gem-fallback{position:absolute;inset:0;display:none;align-items:center;justify-content:center;text-align:center;padding:26px;background:#fff;color:#475467}
      .sipda-gem-fallback.show{display:flex}
      .sipda-gem-fallback strong{display:block;color:#101828;font-size:16px;margin-bottom:7px}
      .sipda-gem-fallback p{font-size:12px;line-height:1.45;margin:0 0 14px}
      @media(max-width:760px){
        #sipdaGemFloatButton{right:14px;bottom:82px;min-width:54px;width:54px;padding:0;border-radius:20px}
        #sipdaGemFloatButton span{display:none}
        #sipdaGemPanel{top:auto;right:0;left:0;bottom:0;width:100%;height:88vh;border-radius:28px 28px 0 0;transform:translateY(calc(100% + 20px))}
        #sipdaGemPanel.open{transform:translateY(0)}
        #sipdaGemPanelBackdrop{background:rgba(15,23,42,.28)}
        .sipda-gem-actions{grid-template-columns:1fr}
      }
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
          <div class="sipda-gem-title">
            <div class="sipda-gem-mark">G</div>
            <div><strong>Gem SIPDA</strong><span>Assistent Gemini vinculat</span></div>
          </div>
          <button id="sipdaGemClose" class="sipda-gem-close" type="button" aria-label="Tancar"><i data-lucide="x"></i></button>
        </header>
        <div class="sipda-gem-body">
          <div class="sipda-gem-note">Popup flotant connectat al Gem de Gemini. Si Google bloqueja la visualització integrada, obre l'agent en una pestanya nova.</div>
          <div class="sipda-gem-actions">
            <a class="sipda-gem-action primary" href="${GEM_URL}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link"></i>Obrir Gem</a>
            <button id="sipdaGemReload" class="sipda-gem-action" type="button"><i data-lucide="refresh-cw"></i>Recarregar</button>
          </div>
          <div class="sipda-gem-frame-wrap">
            <iframe id="sipdaGemFrame" class="sipda-gem-frame" title="Gemini Gem SIPDA" src="about:blank" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div id="sipdaGemFallback" class="sipda-gem-fallback"><div><strong>Gemini pot bloquejar l'iframe</strong><p>Si no es visualitza aquí, utilitza el botó “Obrir Gem”.</p><a class="sipda-gem-action primary" href="${GEM_URL}" target="_blank" rel="noopener noreferrer">Obrir en pestanya nova</a></div></div>
          </div>
        </div>`;
      document.body.appendChild(panel);
      document.getElementById('sipdaGemClose')?.addEventListener('click',close);
      document.getElementById('sipdaGemReload')?.addEventListener('click',loadFrame);
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
    window.SIPDA_GEM_PANEL={build:BUILD,url:GEM_URL,open,close};
  }

  function loadFrame(){
    const frame=document.getElementById('sipdaGemFrame');
    const fallback=document.getElementById('sipdaGemFallback');
    if(fallback) fallback.classList.remove('show');
    if(frame){
      frame.src='about:blank';
      setTimeout(()=>{ frame.src=GEM_URL; },80);
      setTimeout(()=>{ if(fallback) fallback.classList.add('show'); },4500);
    }
  }

  function open(){
    document.getElementById('sipdaGemPanelBackdrop')?.classList.add('open');
    document.getElementById('sipdaGemPanel')?.classList.add('open');
    loadFrame();
  }

  function close(){
    document.getElementById('sipdaGemPanelBackdrop')?.classList.remove('open');
    document.getElementById('sipdaGemPanel')?.classList.remove('open');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
