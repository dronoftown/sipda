/* SIPDA v7 · Agent SIPDA native assistant */
(function(){
  const CHAT_ENDPOINT='https://sipda.pages.dev/api/gemchat';
  const GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  const BUILD='sipda-v7-native-agent-force-rounded-ui-2026-05-22';
  const history=[];

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
  function $(id){return document.getElementById(id)}
  function services(){try{if(window.DATA&&Array.isArray(window.DATA.services))return window.DATA.services}catch(e){}try{return JSON.parse(localStorage.getItem('sipda.v7.history.datasets')||'[]').flatMap(x=>(x.dataset||x).services||[])}catch(e){return[]}}
  function normalizeSource(s){const raw=clean(s.sourceType||s.sourceBadge||s.sourceLabel||'');if(raw==='ME'||/mossos/i.test(raw))return'MOSSOS';if(raw==='PL'||/policia local/i.test(raw))return'PL';return raw||'ALTRES'}
  function normalizePriority(p){const raw=clean(p).toLowerCase();if(raw==='high'||raw.includes('alta'))return'Alta';if(raw==='medium'||raw.includes('mit'))return'Mitjana';if(raw==='low'||raw.includes('baix'))return'Baixa';return clean(p)||'No determinada'}
  function normalizedServices(){return services().map((s,i)=>({index:i+1,source:normalizeSource(s),serviceId:clean(s.serviceId||s.id||''),time:clean(s.time||''),zone:clean(s.zone||s.address||s.displayAddress||''),category:clean(s.category||''),priority:normalizePriority(s.priority),title:clean(s.title||''),summary:clean(s.summary||'').slice(0,700)})).filter(x=>x.title||x.summary||x.zone)}

  function style(){
    let css=$('sipdaGemPanelStyle');
    if(!css){css=document.createElement('style');css.id='sipdaGemPanelStyle';document.head.appendChild(css)}
    css.textContent=`
      .is-locked #sipdaGemFloatButton{display:none!important}
      #sipdaGemFloatButton{
        position:fixed!important;right:0!important;bottom:104px!important;z-index:9990!important;min-width:158px!important;height:48px!important;
        border:1px solid #101828!important;background:#101828!important;color:#fff!important;border-radius:24px 0 0 24px!important;
        box-shadow:0 18px 44px rgba(16,24,40,.24)!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;
        padding:0 18px 0 16px!important;font-family:Inter,Arial,sans-serif!important;font-size:12px!important;font-weight:850!important;letter-spacing:-.01em!important;cursor:pointer!important;
        transition:transform .18s ease,box-shadow .18s ease,background .18s ease!important;
      }
      #sipdaGemFloatButton:hover{transform:translateX(-3px)!important;background:#0054A6!important;border-color:#0054A6!important;box-shadow:0 22px 54px rgba(0,84,166,.30)!important}
      #sipdaGemFloatButton svg{width:17px!important;height:17px!important;stroke:#fff!important;stroke-width:2.45!important}
      #sipdaGemPanelBackdrop{position:fixed!important;inset:0!important;z-index:9991!important;background:rgba(15,23,42,.18)!important;backdrop-filter:blur(10px)!important;display:none!important}
      #sipdaGemPanelBackdrop.open{display:block!important}
      #sipdaGemPanel{
        position:fixed!important;top:18px!important;right:18px!important;bottom:18px!important;width:min(640px,calc(100vw - 28px))!important;z-index:9992!important;
        background:#fff!important;border:1px solid #e5e7eb!important;border-radius:34px!important;box-shadow:0 30px 90px rgba(16,24,40,.20),0 0 0 1px rgba(255,255,255,.92) inset!important;
        overflow:hidden!important;transform:translateX(calc(100% + 30px))!important;transition:transform .28s cubic-bezier(.2,.8,.2,1)!important;display:flex!important;flex-direction:column!important;font-family:Inter,Arial,sans-serif!important;
      }
      #sipdaGemPanel.open{transform:translateX(0)!important}
      #sipdaGemPanel *{box-sizing:border-box!important}
      .sipda-agent-head{min-height:88px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;padding:20px 22px 18px 22px!important;border-bottom:1px solid #eef2f6!important;background:linear-gradient(180deg,#fff 0%,#fbfcff 100%)!important;border-radius:34px 34px 0 0!important}
      .sipda-agent-title{display:flex!important;align-items:center!important;gap:13px!important;min-width:0!important}
      .sipda-agent-mark{width:46px!important;height:46px!important;border-radius:18px!important;background:#101828!important;color:#fff!important;display:grid!important;place-items:center!important;font-weight:900!important;font-size:12px!important;letter-spacing:.02em!important;box-shadow:0 12px 26px rgba(16,24,40,.18)!important}
      .sipda-agent-title strong{display:block!important;font-size:17px!important;letter-spacing:-.035em!important;color:#101828!important;line-height:1.05!important}
      .sipda-agent-title span{display:block!important;margin-top:5px!important;font-size:12px!important;color:#667085!important;font-weight:650!important;letter-spacing:-.01em!important}
      .sipda-agent-close{width:42px!important;height:42px!important;border-radius:18px!important;border:1px solid #e5e7eb!important;background:#fff!important;display:grid!important;place-items:center!important;cursor:pointer!important;color:#344054!important;transition:background .15s ease,border-color .15s ease,transform .15s ease!important}
      .sipda-agent-close:hover{background:#f8fafc!important;border-color:#d0d5dd!important;transform:translateY(-1px)!important}
      .sipda-agent-toolbar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;padding:14px 16px!important;border-bottom:1px solid #eef2f6!important;background:#fff!important;border-radius:0!important}
      .sipda-agent-chip{border:1px solid #0054A6!important;background:#0054A6!important;color:#fff!important;border-radius:18px!important;padding:11px 10px!important;font-size:11px!important;font-weight:850!important;white-space:normal!important;line-height:1.18!important;cursor:pointer!important;box-shadow:0 10px 22px rgba(0,84,166,.18)!important;transition:background .15s ease,border-color .15s ease,transform .15s ease,box-shadow .15s ease!important}
      .sipda-agent-chip:hover{background:#003f7d!important;border-color:#003f7d!important;color:#fff!important;transform:translateY(-1px)!important;box-shadow:0 14px 28px rgba(0,84,166,.26)!important}
      .sipda-agent-feed{flex:1!important;min-height:0!important;overflow:auto!important;padding:18px!important;background:linear-gradient(180deg,#f8fafc 0%,#f6f8fb 100%)!important;display:flex!important;flex-direction:column!important;gap:14px!important;border-radius:0 0 26px 26px!important}
      .sipda-agent-msg{max-width:89%!important;border:1px solid #e5e7eb!important;border-radius:26px!important;padding:14px 16px!important;font-size:13px!important;line-height:1.55!important;box-shadow:0 10px 26px rgba(16,24,40,.045)!important;white-space:pre-wrap!important;letter-spacing:-.005em!important;overflow:hidden!important}
      .sipda-agent-msg.user{align-self:flex-end!important;background:#0054A6!important;color:#fff!important;border-color:#0054A6!important;border-radius:26px 26px 8px 26px!important;box-shadow:0 12px 28px rgba(0,84,166,.22)!important}
      .sipda-agent-msg.ai{align-self:flex-start!important;background:#fff!important;color:#101828!important;border-radius:26px 26px 26px 8px!important}
      .sipda-agent-msg small{display:block!important;margin-bottom:6px!important;font-size:10px!important;text-transform:uppercase!important;letter-spacing:.075em!important;font-weight:850!important;opacity:.55!important}
      .sipda-agent-msg.thinking{color:#667085!important;font-weight:650!important;background:#fff!important;border-radius:26px!important}
      .sipda-agent-context{padding:14px 16px!important;border:1px solid #dbeafe!important;background:#eff6ff!important;color:#1e3a8a!important;border-radius:26px!important;font-size:12px!important;font-weight:650!important;line-height:1.5!important;box-shadow:0 6px 16px rgba(0,84,166,.04)!important;overflow:hidden!important}
      .sipda-agent-composer{border-top:1px solid #eef2f6!important;background:#fff!important;padding:14px 16px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:10px!important;border-radius:0!important}
      .sipda-agent-input{min-height:48px!important;max-height:116px!important;resize:vertical!important;border:1px solid #d0d5dd!important;border-radius:24px!important;padding:13px 15px!important;font-family:Inter,Arial,sans-serif!important;font-size:13px!important;line-height:1.38!important;outline:none!important;background:#fff!important;color:#101828!important;box-shadow:0 1px 2px rgba(16,24,40,.04)!important}
      .sipda-agent-input:focus{border-color:#0054A6!important;box-shadow:0 0 0 4px rgba(0,84,166,.10)!important}
      .sipda-agent-send{width:50px!important;height:48px!important;border-radius:22px!important;border:0!important;background:#101828!important;color:#fff!important;display:grid!important;place-items:center!important;cursor:pointer!important;transition:background .15s ease,transform .15s ease,box-shadow .15s ease!important;box-shadow:0 8px 18px rgba(16,24,40,.16)!important}
      .sipda-agent-send:hover{background:#0054A6!important;transform:translateY(-1px)!important;box-shadow:0 12px 26px rgba(0,84,166,.24)!important}
      .sipda-agent-footer{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;padding:0 18px 16px!important;background:#fff!important;color:#667085!important;font-size:11px!important;font-weight:650!important;border-radius:0 0 34px 34px!important}
      .sipda-agent-footer a{color:#0054A6!important;text-decoration:none!important;font-weight:800!important}
      @media(max-width:760px){#sipdaGemFloatButton{right:0!important;bottom:86px!important;min-width:54px!important;width:56px!important;padding:0!important;border-radius:22px 0 0 22px!important}#sipdaGemFloatButton span{display:none!important}#sipdaGemPanel{top:auto!important;right:0!important;left:0!important;bottom:0!important;width:100%!important;height:88vh!important;border-radius:34px 34px 0 0!important;transform:translateY(calc(100% + 20px))!important}#sipdaGemPanel.open{transform:translateY(0)!important}.sipda-agent-msg{max-width:94%!important}.sipda-agent-head{padding:18px!important}.sipda-agent-toolbar{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:14px!important}}
    `;
  }

  function mount(){
    style();
    if(!$('sipdaGemPanelBackdrop')){const b=document.createElement('div');b.id='sipdaGemPanelBackdrop';document.body.appendChild(b);b.addEventListener('click',close)}
    if(!$('sipdaGemPanel')){
      const panel=document.createElement('aside');panel.id='sipdaGemPanel';panel.setAttribute('aria-label','Agent SIPDA');
      panel.innerHTML=`
        <header class="sipda-agent-head"><div class="sipda-agent-title"><div class="sipda-agent-mark">AI</div><div><strong>Agent SIPDA</strong><span>Assistent operatiu integrat · context PL/ME</span></div></div><button id="sipdaGemClose" class="sipda-agent-close" type="button" aria-label="Tancar"><i data-lucide="x"></i></button></header>
        <div class="sipda-agent-toolbar"><button class="sipda-agent-chip" data-prompt="Resumeix el risc operatiu actual en 5 punts de comandament.">Resum</button><button class="sipda-agent-chip" data-prompt="Quines zones i franges presenten més risc en les pròximes 48 hores?">Zones</button><button class="sipda-agent-chip" data-prompt="Quines accions preventives recomanes per al proper torn?">Accions</button><button class="sipda-agent-chip" data-prompt="Detecta incongruències o buits de dades en els informes carregats.">Control</button></div>
        <div id="sipdaAgentFeed" class="sipda-agent-feed"><div class="sipda-agent-context">Agent integrat dins de SIPDA. Treballa amb serveis normalitzats, informes carregats i context operatiu municipal. Experiència nativa, sense iframe.</div><div class="sipda-agent-msg ai"><small>Agent SIPDA</small>Preparat. Carrega informes i pregunta’m pel risc, patrons, zones, franges o dispositiu preventiu.</div></div>
        <div class="sipda-agent-composer"><textarea id="sipdaAgentInput" class="sipda-agent-input" placeholder="Pregunta a l'Agent SIPDA..."></textarea><button id="sipdaAgentSend" class="sipda-agent-send" type="button" aria-label="Enviar"><i data-lucide="send"></i></button></div>
        <div class="sipda-agent-footer"><span id="sipdaAgentStatus">Context: 0 serveis</span><a href="${GEM_URL}" target="_blank">Gem extern</a></div>`;
      document.body.appendChild(panel);
      $('sipdaGemClose')?.addEventListener('click',close);
      $('sipdaAgentSend')?.addEventListener('click',send);
      $('sipdaAgentInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
      document.querySelectorAll('.sipda-agent-chip').forEach(ch=>ch.addEventListener('click',()=>{const input=$('sipdaAgentInput');if(input){input.value=ch.dataset.prompt||'';send();}}));
    }
    if(!$('sipdaGemFloatButton')){const btn=document.createElement('button');btn.id='sipdaGemFloatButton';btn.type='button';btn.innerHTML='<i data-lucide="sparkles"></i><span>Agent SIPDA</span>';btn.addEventListener('click',open);document.body.appendChild(btn)}
    if(window.lucide?.createIcons)window.lucide.createIcons();
    window.SIPDA_GEM_PANEL={build:BUILD,open,close,send};
    refreshStatus();
  }

  function refreshStatus(){const st=$('sipdaAgentStatus');if(st)st.textContent='Context: '+normalizedServices().length+' serveis'}
  function open(){refreshStatus();$('sipdaGemPanelBackdrop')?.classList.add('open');$('sipdaGemPanel')?.classList.add('open')}
  function close(){$('sipdaGemPanelBackdrop')?.classList.remove('open');$('sipdaGemPanel')?.classList.remove('open')}
  function addMessage(role,text,cls){const feed=$('sipdaAgentFeed');if(!feed)return;const div=document.createElement('div');div.className='sipda-agent-msg '+(cls||role);div.innerHTML='<small>'+(role==='user'?'Comandament':'Agent SIPDA')+'</small>'+esc(text);feed.appendChild(div);feed.scrollTop=feed.scrollHeight;return div}
  function contextPayload(){return{services:normalizedServices(),rawText:window.SIPDA_LAST_PDF_TEXT||'',predictionRows:[]}}

  async function send(){
    const input=$('sipdaAgentInput');const msg=clean(input?.value||'');if(!msg)return;if(input)input.value='';
    addMessage('user',msg,'user');history.push({role:'user',text:msg});
    const thinking=addMessage('ai','Analitzant context SIPDA...', 'ai thinking');
    try{
      const res=await fetch(CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history,context:contextPayload()})});
      const data=await res.json().catch(()=>({error:'Resposta no JSON'}));
      if(!res.ok)throw new Error(data?.error||'Error endpoint');
      if(thinking)thinking.remove();
      const answer=data.answer||'No he pogut generar resposta.';
      addMessage('ai',answer,'ai');history.push({role:'assistant',text:answer});
    }catch(e){if(thinking)thinking.remove();addMessage('ai','No he pogut connectar amb l’agent integrat. Detall: '+(e.message||e),'ai')}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
