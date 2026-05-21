/* SIPDA v7 · Agent SIPDA actions: attachments, documents, charts, tables */
(function(){
  const BUILD='sipda-v7-agent-actions-2026-05-22';
  const CHAT_ENDPOINT='https://sipda.pages.dev/api/gemchat';
  let attachedFile=null;
  let history=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const $=id=>document.getElementById(id);

  function services(){try{if(window.DATA&&Array.isArray(window.DATA.services))return window.DATA.services}catch(e){}try{return JSON.parse(localStorage.getItem('sipda.v7.history.datasets')||'[]').flatMap(x=>(x.dataset||x).services||[])}catch(e){return[]}}
  function contextPayload(){return{services:services().slice(0,350),rawText:window.SIPDA_LAST_PDF_TEXT||'',predictionRows:window.SIPDA_LAST_PREDICCIO_ROWS||[]}}

  function ensureStyle(){
    if($('sipdaAgentActionsStyle')) return;
    const css=document.createElement('style');
    css.id='sipdaAgentActionsStyle';
    css.textContent=`
      .sipda-agent-tools{display:flex!important;gap:8px!important;padding:0 16px 10px!important;background:#fff!important;align-items:center!important}
      .sipda-agent-tool{height:36px!important;border-radius:16px!important;border:1px solid #e5e7eb!important;background:#fff!important;color:#344054!important;padding:0 12px!important;font-size:11px!important;font-weight:850!important;display:inline-flex!important;align-items:center!important;gap:7px!important;cursor:pointer!important;box-shadow:0 1px 2px rgba(16,24,40,.04)!important}
      .sipda-agent-tool:hover{border-color:#0054A6!important;color:#0054A6!important;background:#f2f7ff!important}
      .sipda-agent-file-pill{display:none!important;max-width:100%!important;margin:0 16px 10px!important;padding:10px 12px!important;border-radius:18px!important;background:#eff6ff!important;border:1px solid #bfdbfe!important;color:#1e3a8a!important;font-size:12px!important;font-weight:750!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}
      .sipda-agent-file-pill.show{display:flex!important}
      .sipda-agent-file-pill button{border:0!important;background:#fff!important;color:#0054A6!important;border-radius:12px!important;padding:5px 8px!important;font-weight:900!important;cursor:pointer!important}
      .sipda-result-card{width:100%!important;max-width:100%!important;border:1px solid #e5e7eb!important;background:#fff!important;border-radius:26px!important;padding:16px!important;box-shadow:0 10px 26px rgba(16,24,40,.045)!important;white-space:normal!important;color:#101828!important}
      .sipda-result-card h3{margin:0 0 8px!important;font-size:16px!important;letter-spacing:-.03em!important;color:#101828!important}
      .sipda-result-card h4{margin:14px 0 6px!important;font-size:13px!important;color:#101828!important}
      .sipda-result-card p{margin:0 0 10px!important;font-size:13px!important;line-height:1.55!important;color:#344054!important;white-space:pre-wrap!important}
      .sipda-result-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin-top:12px!important}
      .sipda-result-actions button{height:34px!important;border-radius:14px!important;border:1px solid #e5e7eb!important;background:#fff!important;color:#344054!important;padding:0 10px!important;font-size:11px!important;font-weight:850!important;cursor:pointer!important}
      .sipda-result-actions button.primary{background:#101828!important;border-color:#101828!important;color:#fff!important}
      .sipda-result-table-wrap{overflow:auto!important;margin-top:10px!important;border:1px solid #e5e7eb!important;border-radius:18px!important}
      .sipda-result-table{width:100%!important;border-collapse:collapse!important;font-size:12px!important;background:#fff!important}
      .sipda-result-table th{background:#f8fafc!important;color:#344054!important;font-weight:900!important;text-align:left!important;padding:10px!important;border-bottom:1px solid #e5e7eb!important}
      .sipda-result-table td{padding:10px!important;border-bottom:1px solid #eef2f6!important;color:#344054!important;vertical-align:top!important}
      .sipda-chart-bars{display:grid!important;gap:9px!important;margin-top:12px!important}
      .sipda-chart-row{display:grid!important;grid-template-columns:110px 1fr 44px!important;gap:10px!important;align-items:center!important;font-size:12px!important;color:#344054!important}
      .sipda-chart-track{height:12px!important;border-radius:999px!important;background:#eef2f7!important;overflow:hidden!important}
      .sipda-chart-fill{height:100%!important;border-radius:999px!important;background:#0054A6!important}
      @media(max-width:760px){.sipda-chart-row{grid-template-columns:80px 1fr 34px!important}.sipda-agent-tools{padding:0 14px 10px!important}.sipda-agent-file-pill{margin:0 14px 10px!important}}
    `;
    document.head.appendChild(css);
  }

  function waitForPanel(){
    if($('sipdaGemPanel') && $('sipda-agent-composer') || $('sipdaAgentInput')) return enhance();
    setTimeout(waitForPanel,300);
  }

  function enhance(){
    ensureStyle();
    if($('sipdaAgentFileInput')) return;
    const composer=document.querySelector('.sipda-agent-composer');
    if(!composer) return;

    const tools=document.createElement('div');
    tools.className='sipda-agent-tools';
    tools.innerHTML='<button id="sipdaAgentAttach" class="sipda-agent-tool" type="button"><i data-lucide="paperclip"></i>Adjuntar fitxer</button><button id="sipdaAgentExportLast" class="sipda-agent-tool" type="button"><i data-lucide="file-down"></i>Exportar últim</button><input id="sipdaAgentFileInput" type="file" accept=".txt,.csv,.json,.pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,text/plain,text/csv,application/json,image/*" hidden>';
    const pill=document.createElement('div');
    pill.id='sipdaAgentFilePill';
    pill.className='sipda-agent-file-pill';
    pill.innerHTML='<span id="sipdaAgentFileName"></span><button id="sipdaAgentClearFile" type="button">Treure</button>';
    composer.parentElement.insertBefore(tools,composer);
    composer.parentElement.insertBefore(pill,composer);

    $('sipdaAgentAttach')?.addEventListener('click',()=>$('sipdaAgentFileInput')?.click());
    $('sipdaAgentFileInput')?.addEventListener('change',handleFile);
    $('sipdaAgentClearFile')?.addEventListener('click',clearFile);
    $('sipdaAgentExportLast')?.addEventListener('click',()=>exportLast());

    const oldButton=$('sipdaAgentSend');
    const oldInput=$('sipdaAgentInput');
    if(oldButton){
      const clone=oldButton.cloneNode(true);
      oldButton.parentNode.replaceChild(clone,oldButton);
      clone.addEventListener('click',sendEnhanced);
    }
    if(oldInput){
      const clone=oldInput.cloneNode(true);
      oldInput.parentNode.replaceChild(clone,oldInput);
      clone.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendEnhanced();}});
    }
    document.querySelectorAll('.sipda-agent-chip').forEach(ch=>{
      const clone=ch.cloneNode(true);
      ch.parentNode.replaceChild(clone,ch);
      clone.addEventListener('click',()=>{const input=$('sipdaAgentInput');if(input){input.value=clone.dataset.prompt||'';sendEnhanced();}});
    });
    if(window.lucide?.createIcons) window.lucide.createIcons();
    window.SIPDA_AGENT_ACTIONS={build:BUILD,send:sendEnhanced,exportLast};
  }

  async function handleFile(e){
    const file=e.target.files?.[0];
    if(!file) return;
    const base={name:file.name,type:file.type||'unknown',mimeType:file.type||'application/octet-stream',size:file.size};
    let text='';
    let data='';
    if(file.type.startsWith('text/') || /\.(txt|csv|json)$/i.test(file.name)){
      text=await file.text();
    }else if(file.type.startsWith('image/') || file.type==='application/pdf'){
      data=await fileToBase64(file);
    }else{
      try{text=await file.text()}catch(_){data=await fileToBase64(file)}
    }
    attachedFile={...base,text:text.slice(0,28000),data:data.slice(0,900000)};
    $('sipdaAgentFileName').textContent='Fitxer adjunt: '+file.name;
    $('sipdaAgentFilePill').classList.add('show');
  }

  function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file);});}
  function clearFile(){attachedFile=null;const input=$('sipdaAgentFileInput');if(input)input.value='';$('sipdaAgentFilePill')?.classList.remove('show');}

  function addUser(text){addBubble('user',text,'Comandament');}
  function addThinking(){return addBubble('ai','Analitzant context SIPDA i generant resposta ampliada...','Agent SIPDA','thinking');}
  function addBubble(role,text,label,extra){const feed=$('sipdaAgentFeed');if(!feed)return null;const div=document.createElement('div');div.className='sipda-agent-msg '+role+(extra?' '+extra:'');div.innerHTML='<small>'+esc(label||role)+'</small>'+esc(text);feed.appendChild(div);feed.scrollTop=feed.scrollHeight;return div;}

  async function sendEnhanced(){
    const input=$('sipdaAgentInput');
    const msg=clean(input?.value||'');
    if(!msg && !attachedFile) return;
    const finalMsg=msg || 'Analitza el fitxer adjunt i aporta lectura operativa.';
    if(input) input.value='';
    addUser(finalMsg+(attachedFile?'\n[Fitxer: '+attachedFile.name+']':''));
    history.push({role:'user',text:finalMsg});
    const thinking=addThinking();
    try{
      const res=await fetch(CHAT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:finalMsg,history,context:contextPayload(),attachment:attachedFile})});
      const data=await res.json().catch(()=>({error:'Resposta no JSON'}));
      if(!res.ok) throw new Error(data?.error||'Error endpoint');
      if(thinking) thinking.remove();
      renderStructured(data);
      history.push({role:'assistant',text:data.answer||''});
      clearFile();
    }catch(e){
      if(thinking) thinking.remove();
      addBubble('ai','No he pogut completar l’acció. Detall: '+(e.message||e),'Agent SIPDA');
    }
  }

  function renderStructured(data){
    const feed=$('sipdaAgentFeed'); if(!feed) return;
    const card=document.createElement('div');
    card.className='sipda-result-card';
    card.dataset.payload=JSON.stringify(data);
    let html='<h3>'+esc(data.mode==='document'?'Document generat':data.mode==='chart'?'Gràfic generat':data.mode==='table'?'Taula generada':'Anàlisi Agent SIPDA')+'</h3>';
    html+='<p>'+esc(data.answer||'Resposta generada.')+'</p>';
    if(data.document) html+=renderDocument(data.document);
    if(data.table) html+=renderTable(data.table);
    if(data.chart) html+=renderChart(data.chart);
    if(Array.isArray(data.actions)&&data.actions.length){html+='<h4>Accions recomanades</h4><p>'+esc(data.actions.map((a,i)=>(i+1)+'. '+a).join('\n'))+'</p>';}
    html+='<div class="sipda-result-actions"><button class="primary" data-agent-action="pdf">Descarregar PDF</button><button data-agent-action="copy">Copiar</button><button data-agent-action="print">Imprimir</button></div>';
    card.innerHTML=html;
    feed.appendChild(card); feed.scrollTop=feed.scrollHeight;
  }

  function renderDocument(doc){return '<h4>'+esc(doc.title||'Document')+'</h4>'+(doc.subtitle?'<p>'+esc(doc.subtitle)+'</p>':'')+(Array.isArray(doc.sections)?doc.sections.map(s=>'<h4>'+esc(s.heading||'Apartat')+'</h4><p>'+esc(s.content||'')+'</p>').join(''):'');}
  function renderTable(t){if(!Array.isArray(t.headers)||!Array.isArray(t.rows))return'';return '<h4>'+esc(t.title||'Taula')+'</h4><div class="sipda-result-table-wrap"><table class="sipda-result-table"><thead><tr>'+t.headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function renderChart(c){const labels=c.labels||[], ds=c.datasets?.[0]||{values:[]};const max=Math.max(1,...(ds.values||[]).map(Number));return '<h4>'+esc(c.title||'Gràfic')+'</h4><div class="sipda-chart-bars">'+labels.map((l,i)=>{const v=Number(ds.values?.[i]||0);return '<div class="sipda-chart-row"><span>'+esc(l)+'</span><div class="sipda-chart-track"><div class="sipda-chart-fill" style="width:'+Math.max(4,(v/max)*100)+'%"></div></div><b>'+esc(v)+'</b></div>';}).join('')+'</div>';}

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-agent-action]'); if(!b) return;
    const card=b.closest('.sipda-result-card'); if(!card) return;
    const action=b.dataset.agentAction;
    if(action==='copy') navigator.clipboard?.writeText(card.innerText);
    if(action==='print') printCard(card);
    if(action==='pdf') exportCardPdf(card);
  });

  function exportLast(){const cards=[...document.querySelectorAll('.sipda-result-card')];const last=cards.at(-1);if(last) exportCardPdf(last);}
  function printCard(card){const w=window.open('','_blank');w.document.write('<html><head><title>SIPDA</title><style>body{font-family:Inter,Arial,sans-serif;padding:28px;color:#101828}h3,h4{margin-bottom:8px}p{white-space:pre-wrap;line-height:1.55}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}</style></head><body>'+card.innerHTML+'</body></html>');w.document.close();w.print();}
  function exportCardPdf(card){printCard(card);}

  waitForPanel();
})();
