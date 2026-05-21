/* SIPDA v7 · Agent SIPDA native assistant */
(function(){
  const CHAT_ENDPOINT='https://sipda.pages.dev/api/gemchat';
  const GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  const BUILD='sipda-v7-native-agent-panel-2026-05-22';
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
      #sipdaGemFloatButton{position:fixed;right:22px;bottom:92px;z-index:9990;min-width:172px;height:48px;border:1px solid rgba(0,84,166,.28);background:#0054A6;color:#fff;border-radius:999px;box-shadow:0 18px 42px rgba(0,84,166,.28),0 8px 18px rgba(16,24,40,.12);display:flex;align-items:center;justify-content:center;gap:9px;padding:0 18px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
      #sipdaGemFloatButton:hover{transform:translateY(-2px);box-shadow:0 22px 52px rgba(0,84,166,.34),0 10px 22px rgba(16,24,40,.14)}
      #sipdaGemFloatButton svg{width:18px;height:18px;stroke-width:2.6}
      #sipdaGemPanelBackdrop{position:fixed;inset:0;z-index:9991;background:rgba(15,23,42,.22);backdrop-filter:blur(8px);display:none}
      #sipdaGemPanelBackdrop.open{display:block}
      #sipdaGemPanel{position:fixed;top:18px;right:18px;bottom:18px;width:min(560px,calc(100vw - 28px));z-index:9992;background:#fff;border:1px solid #e4e7ec;border-radius:28px;box-shadow:0 28px 80px rgba(16,24,40,.22);overflow:hidden;transform:translateX(calc(100% + 30px));transition:transform .26s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;font-family:Inter,Arial,sans-serif}
      #sipdaGemPanel.open{transform:translateX(0)}
      .sipda-agent-head{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 18px 16px 20px;border-bottom:1px solid #eef2f7;background:linear-gradient(180deg,#fff,#f8fbff)}
      .sipda-agent-title{display:flex;align-items:center;gap:12px;min-width:0}.sipda-agent-mark{width:44px;height:44px;border-radius:16px;background:#0054A6;color:#fff;display:grid;place-items:center;font-weight:950;box-shadow:0 10px 24px rgba(0,84,166,.22)}
      .sipda-agent-title strong{display:block;font-size:16px;letter-spacing:-.02em;color:#101828}.sipda-agent-title span{display:block;margin-top:3px;font-size:12px;color:#667085;font-weight:750}.sipda-agent-close{width:40px;height:40px;border-radius:999px;border:1px solid #e4e7ec;background:#fff;display:grid;place-items:center;cursor:pointer;color:#101828}
      .sipda-agent-toolbar{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid #eef2f7;background:#fff;overflow:auto}.sipda-agent-chip{border:1px solid #e4e7ec;background:#f8fafc;color:#344054;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer}.sipda-agent-chip:hover{background:#eef6ff;border-color:#bfdbfe;color:#0054A6}
      .sipda-agent-feed{flex:1;min-height:0;overflow:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:12px}.sipda-agent-msg{max-width:88%;border:1px solid #e4e7ec;border-radius:18px;padding:12px 14px;font-size:13px;line-height:1.5;box-shadow:0 8px 22px rgba(16,24,40,.04);white-space:pre-wrap}.sipda-agent-msg.user{align-self:flex-end;background:#0054A6;color:#fff;border-color:#0054A6}.sipda-agent-msg.ai{align-self:flex-start;background:#fff;color:#101828}.sipda-agent-msg small{display:block;margin-bottom:5px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:950;opacity:.62}.sipda-agent-msg.thinking{color:#667085;font-weight:750}.sipda-agent-context{padding:10px 12px;border:1px solid #dbeafe;background:#eff6ff;color:#1e3a8a;border-radius:16px;font-size:12px;font-weight:750;line-height:1.45}
      .sipda-agent-composer{border-top:1px solid #eef2f7;background:#fff;padding:12px;display:grid;grid-template-columns:1fr auto;gap:10px}.sipda-agent-input{min-height:46px;max-height:110px;resize:vertical;border:1px solid #e4e7ec;border-radius:16px;padding:12px 13px;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.35;outline:none}.sipda-agent-input:focus{border-color:#0054A6;box-shadow:0 0 0 4px rgba(0,84,166,.10)}.sipda-agent-send{width:48px;height:46px;border-radius:16px;border:0;background:#101828;color:#fff;display:grid;place-items:center;cursor:pointer}.sipda-agent-footer{display:flex;justify-content:space-between;gap:10px;padding:0 12px 12px;background:#fff;color:#667085;font-size:11px;font-weight:750}.sipda-agent-footer a{color:#0054A6;text-decoration:none;font-weight:900}
      @media(max-width:760px){#sipdaGemFloatButton{right:14px;bottom:82px;min-width:54px;width:54px;padding:0;border-radius:20px}#sipdaGemFloatButton span{display:none}#sipdaGemPanel{top:auto;right:0;left:0;bottom:0;width:100%;height:88vh;border-radius:28px 28px 0 0;transform:translateY(calc(100% + 20px))}#sipdaGemPanel.open{transform:translateY(0)}.sipda-agent-msg{max-width:94%}}
    `;
  }

  function mount(){
    style();
    if(!$('sipdaGemPanelBackdrop')){const b=document.createElement('div');b.id='sipdaGemPanelBackdrop';document.body.appendChild(b);b.addEventListener('click',close)}
    if(!$('sipdaGemPanel')){
      const panel=document.createElement('aside');panel.id='sipdaGemPanel';panel.setAttribute('aria-label','Agent SIPDA');
      panel.innerHTML=`
        <header class="sipda-agent-head"><div class="sipda-agent-title"><div class="sipda-agent-mark">AI</div><div><strong>Agent SIPDA</strong><span>Assistent integrat · context PL/ME</span></div></div><button id="sipdaGemClose" class="sipda-agent-close" type="button" aria-label="Tancar"><i data-lucide="x"></i></button></header>
        <div class="sipda-agent-toolbar"><button class="sipda-agent-chip" data-prompt="Resumeix el risc operatiu actual en 5 punts de comandament.">Resum comandament</button><button class="sipda-agent-chip" data-prompt="Quines zones i franges presenten més risc en les pròximes 48 hores?">Zones i franges</button><button class="sipda-agent-chip" data-prompt="Quines accions preventives recomanes per al proper torn?">Accions preventives</button><button class="sipda-agent-chip" data-prompt="Detecta incongruències o buits de dades en els informes carregats.">Control qualitat</button></div>
        <div id="sipdaAgentFeed" class="sipda-agent-feed"><div class="sipda-agent-context">Agent integrat dins de SIPDA. Utilitza serveis normalitzats, informes carregats i context operatiu local. No depèn d'iframe ni de pestanyes externes.</div><div class="sipda-agent-msg ai"><small>Agent SIPDA</small>Preparat. Carrega informes i pregunta’m pel risc, patrons, zones, franges o dispositiu preventiu.</div></div>
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
