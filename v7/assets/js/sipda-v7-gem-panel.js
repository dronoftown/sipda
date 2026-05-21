/* SIPDA v7 · Agent SIPDA native assistant */
(function(){
  const CHAT_ENDPOINT='https://sipda.pages.dev/api/gemchat';
  const GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  const BUILD='sipda-v7-native-agent-ui-rounded-bluechips-2026-05-22';
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
        position:fixed;
        right:0;
        bottom:104px;
        z-index:9990;
        min-width:158px;
        height:48px;
        border:1px solid #101828;
        background:#101828;
        color:#fff;
        border-radius:24px 0 0 24px;
        box-shadow:0 18px 44px rgba(16,24,40,.24);
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        padding:0 18px 0 16px;
        font-family:Inter,Arial,sans-serif;
        font-size:12px;
        font-weight:850;
        letter-spacing:-.01em;
        cursor:pointer;
        transition:transform .18s ease,box-shadow .18s ease,background .18s ease;
      }
      #sipdaGemFloatButton:hover{transform:translateX(-3px);background:#0054A6;border-color:#0054A6;box-shadow:0 22px 54px rgba(0,84,166,.30)}
      #sipdaGemFloatButton svg{width:17px;height:17px;stroke:#fff;stroke-width:2.45}
      #sipdaGemPanelBackdrop{position:fixed;inset:0;z-index:9991;background:rgba(15,23,42,.18);backdrop-filter:blur(10px);display:none}
      #sipdaGemPanelBackdrop.open{display:block}
      #sipdaGemPanel{
        position:fixed;
        top:18px;
        right:18px;
        bottom:18px;
        width:min(640px,calc(100vw - 28px));
        z-index:9992;
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:32px;
        box-shadow:0 30px 90px rgba(16,24,40,.20),0 0 0 1px rgba(255,255,255,.92) inset;
        overflow:hidden;
        transform:translateX(calc(100% + 30px));
        transition:transform .28s cubic-bezier(.2,.8,.2,1);
        display:flex;
        flex-direction:column;
        font-family:Inter,Arial,sans-serif;
      }
      #sipdaGemPanel.open{transform:translateX(0)}
      .sipda-agent-head{
        min-height:88px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:20px 22px 18px 22px;
        border-bottom:1px solid #eef2f6;
        background:linear-gradient(180deg,#fff 0%,#fbfcff 100%);
      }
      .sipda-agent-title{display:flex;align-items:center;gap:13px;min-width:0}
      .sipda-agent-mark{width:46px;height:46px;border-radius:18px;background:#101828;color:#fff;display:grid;place-items:center;font-weight:900;font-size:12px;letter-spacing:.02em;box-shadow:0 12px 26px rgba(16,24,40,.18)}
      .sipda-agent-title strong{display:block;font-size:17px;letter-spacing:-.035em;color:#101828;line-height:1.05}
      .sipda-agent-title span{display:block;margin-top:5px;font-size:12px;color:#667085;font-weight:650;letter-spacing:-.01em}
      .sipda-agent-close{width:42px;height:42px;border-radius:16px;border:1px solid #e5e7eb;background:#fff;display:grid;place-items:center;cursor:pointer;color:#344054;transition:background .15s ease,border-color .15s ease,transform .15s ease}
      .sipda-agent-close:hover{background:#f8fafc;border-color:#d0d5dd;transform:translateY(-1px)}
      .sipda-agent-toolbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px 16px;border-bottom:1px solid #eef2f6;background:#fff}
      .sipda-agent-chip{border:1px solid #0054A6;background:#0054A6;color:#fff;border-radius:18px;padding:11px 10px;font-size:11px;font-weight:850;white-space:normal;line-height:1.18;cursor:pointer;box-shadow:0 10px 22px rgba(0,84,166,.18);transition:background .15s ease,border-color .15s ease,transform .15s ease,box-shadow .15s ease}
      .sipda-agent-chip:hover{background:#003f7d;border-color:#003f7d;transform:translateY(-1px);box-shadow:0 14px 28px rgba(0,84,166,.26)}
      .sipda-agent-feed{flex:1;min-height:0;overflow:auto;padding:18px;background:linear-gradient(180deg,#f8fafc 0%,#f6f8fb 100%);display:flex;flex-direction:column;gap:14px}
      .sipda-agent-msg{max-width:89%;border:1px solid #e5e7eb;border-radius:24px;padding:14px 16px;font-size:13px;line-height:1.55;box-shadow:0 10px 26px rgba(16,24,40,.045);white-space:pre-wrap;letter-spacing:-.005em}
      .sipda-agent-msg.user{align-self:flex-end;background:#0054A6;color:#fff;border-color:#0054A6;border-radius:24px 24px 8px 24px;box-shadow:0 12px 28px rgba(0,84,166,.22)}
      .sipda-agent-msg.ai{align-self:flex-start;background:#fff;color:#101828;border-radius:24px 24px 24px 8px}
      .sipda-agent-msg small{display:block;margin-bottom:6px;font-size:10px;text-transform:uppercase;letter-spacing:.075em;font-weight:850;opacity:.55}
      .sipda-agent-msg.thinking{color:#667085;font-weight:650;background:#fff}
      .sipda-agent-context{padding:14px 16px;border:1px solid #dbeafe;background:#eff6ff;color:#1e3a8a;border-radius:24px;font-size:12px;font-weight:650;line-height:1.5;box-shadow:0 6px 16px rgba(0,84,166,.04)}
      .sipda-agent-composer{border-top:1px solid #eef2f6;background:#fff;padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:10px}
      .sipda-agent-input{min-height:48px;max-height:116px;resize:vertical;border:1px solid #d0d5dd;border-radius:22px;padding:13px 15px;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.38;outline:none;background:#fff;color:#101828;box-shadow:0 1px 2px rgba(16,24,40,.04)}
      .sipda-agent-input:focus{border-color:#0054A6;box-shadow:0 0 0 4px rgba(0,84,166,.10)}
      .sipda-agent-send{width:50px;height:48px;border-radius:20px;border:0;background:#101828;color:#fff;display:grid;place-items:center;cursor:pointer;transition:background .15s ease,transform .15s ease,box-shadow .15s ease;box-shadow:0 8px 18px rgba(16,24,40,.16)}
      .sipda-agent-send:hover{background:#0054A6;transform:translateY(-1px);box-shadow:0 12px 26px rgba(0,84,166,.24)}
      .sipda-agent-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:0 18px 16px;background:#fff;color:#667085;font-size:11px;font-weight:650}
      .sipda-agent-footer a{color:#0054A6;text-decoration:none;font-weight:800}
      @media(max-width:760px){#sipdaGemFloatButton{right:0;bottom:86px;min-width:54px;width:56px;padding:0;border-radius:22px 0 0 22px}#sipdaGemFloatButton span{display:none}#sipdaGemPanel{top:auto;right:0;left:0;bottom:0;width:100%;height:88vh;border-radius:32px 32px 0 0;transform:translateY(calc(100% + 20px))}#sipdaGemPanel.open{transform:translateY(0)}.sipda-agent-msg{max-width:94%}.sipda-agent-head{padding:18px}.sipda-agent-toolbar{grid-template-columns:repeat(2,minmax(0,1fr));padding:14px}}
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
