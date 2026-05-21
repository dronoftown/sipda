/* SIPDA v7 · puente endpoint IA 48H */
(function(){
  const BUILD='sipda-v7-endpoint-ia-bridge-2026-05-22';
  const ENDPOINT='/api/prediccio48h';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();

  function services(){
    try{ if(window.DATA && Array.isArray(window.DATA.services)) return window.DATA.services; }catch(e){}
    try{
      const h=JSON.parse(localStorage.getItem('sipda.v7.history.datasets')||'[]');
      return h.flatMap(x=>(x.dataset||x).services||[]);
    }catch(e){ return []; }
  }

  function buildReportFromServices(items,source){
    return items
      .filter(s=>!source || s.sourceType===source || s.sourceBadge===source)
      .map((s,i)=>[
        'Servei '+(i+1),
        'Font: '+(s.sourceLabel||s.sourceType||s.sourceBadge||'No determinada'),
        'Hora: '+(s.time||'No determinada'),
        'Zona: '+(s.zone||s.address||s.displayAddress||'No determinada'),
        'Categoria: '+(s.category||'No determinada'),
        'Prioritat: '+(s.priority||'No determinada'),
        'Titol: '+(s.title||'Sense titol'),
        'Resum: '+(s.summary||'')
      ].join('\n')).join('\n\n');
  }

  function payload(){
    const raw=window.SIPDA_LAST_PDF_TEXT||'';
    const items=services();
    const fromServicesPL=buildReportFromServices(items,'PL');
    const fromServicesME=buildReportFromServices(items,'MOSSOS');
    return {
      informePoliciaLocal: raw || fromServicesPL || buildReportFromServices(items,''),
      informeMossos: fromServicesME || '',
      origen: 'sipda-v7',
      totalServeis: items.length,
      build: BUILD
    };
  }

  function ensureModal(){
    let m=$('sipdaPrediction48Modal');
    if(m) return m;
    m=document.createElement('section');
    m.id='sipdaPrediction48Modal';
    m.className='modal';
    m.hidden=true;
    m.innerHTML='<div class="modal-card"><header class="modal-head"><div><strong>Predicció operativa 48 h</strong><span>SIPDA IA · Anàlisi de novetats PL/ME</span></div><button id="sipdaPredClose" type="button"><i data-lucide="x"></i></button></header><div class="modal-body"><div id="sipdaPredBody"></div></div><footer class="modal-actions"><button id="sipdaPredClose2" class="btn white" type="button">Tancar</button></footer></div>';
    document.body.appendChild(m);
    $('sipdaPredClose')?.addEventListener('click',()=>m.hidden=true);
    $('sipdaPredClose2')?.addEventListener('click',()=>m.hidden=true);
    m.addEventListener('click',e=>{ if(e.target===m) m.hidden=true; });
    return m;
  }

  function thinking(){
    const body=$('sipdaPredBody');
    if(!body) return;
    body.innerHTML='<div class="sipda-pred-thinking"><div><div class="sipda-pred-spinner"></div><strong>SIPDA IA està analitzant les novetats</strong><p id="sipdaPredStep">Connectant amb endpoint intern...</p></div></div>';
    const steps=['Preparant informes PL/ME','Enviant dades al motor IA','Analitzant patrons documentals','Generant matriu predictiva 48H'];
    let i=0;
    clearInterval(window.__sipdaGeminiBridgeTimer);
    window.__sipdaGeminiBridgeTimer=setInterval(()=>{i=(i+1)%steps.length;const st=$('sipdaPredStep');if(st)st.textContent=steps[i];},850);
  }

  function badge(p){
    const v=String(p||'').toLowerCase();
    const cls=v.includes('alta')||v==='high'?'high':v.includes('mit')||v==='medium'?'medium':'low';
    const txt=cls==='high'?'Alta':cls==='medium'?'Mitjana':'Baixa';
    return '<em class="priority-badge '+cls+'">'+txt+'</em>';
  }

  function normalizeRows(data){
    if(Array.isArray(data?.prediccio48h)) return data.prediccio48h;
    if(Array.isArray(data?.predicciones)) return data.predicciones;
    if(Array.isArray(data?.rows)) return data.rows;
    return [];
  }

  function render(data){
    clearInterval(window.__sipdaGeminiBridgeTimer);
    const body=$('sipdaPredBody');
    if(!body) return;
    const rows=normalizeRows(data);
    const resum=data?.resumExecutiu||data?.resumenEjecutivo||data?.resum||'Predicció generada per SIPDA IA.';
    const recom=data?.recomanacioComandament||data?.recomendacionMando||data?.recomanacio||'';
    const motor=data?.motor||'Endpoint intern';
    const model=data?.model||'SIPDA';
    const generated=data?.generatA||data?.generatedAt||new Date().toISOString();

    const table=rows.length?'<div class="sipda-pred-table-wrap"><table class="sipda-pred-table"><thead><tr><th>Risc</th><th>Zona</th><th>Franja</th><th>Probabilitat</th><th>Impacte</th><th>Predicció</th><th>Acció preventiva</th><th>Base documental</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+badge(r.prioritat||r.priority)+'<br><b>'+esc(r.risc||r.riesgo||'Risc operatiu')+'</b></td><td>'+esc(r.zona||'No determinada')+'</td><td>'+esc(r.franja||'No determinada')+'</td><td><b>'+esc(r.probabilitat||r.probabilidad||'No determinada')+'</b></td><td>'+esc(r.impacte||r.impacto||'No determinat')+'</td><td class="sipda-pred-hypothesis">'+esc(r.prediccio||r.prediccion||'')+'</td><td>'+esc(r.accioPreventiva||r.accionPreventiva||'')+'</td><td><span class="sipda-pred-muted">'+esc(r.baseDocumental||r.base||'')+'</span></td></tr>').join('')+'</tbody></table></div>':'<div class="sipda-pred-empty">L’endpoint ha respost però no ha retornat files de predicció.</div>';

    const patrons=Array.isArray(data?.patronsDetectats)?data.patronsDetectats:[];
    body.innerHTML='<article class="panel"><div class="panel-head compact"><div><h2>Predicció IA 48 h</h2><p>'+esc(resum)+'</p></div><span class="status-pill">'+esc(motor)+'</span></div><div class="modal-body"><div class="sipda-pred-meta"><span>Motor: '+esc(motor)+'</span><span>Model: '+esc(model)+'</span><span>Generat: '+esc(generated)+'</span><span>Files: '+rows.length+'</span></div>'+(patrons.length?'<div class="sipda-pred-alert">Patrons detectats: '+esc(patrons.join(' · '))+'</div>':'')+table+(recom?'<div class="sipda-pred-alert"><b>Recomanació comandament:</b> '+esc(recom)+'</div>':'')+'</div></article>';
    if(window.lucide?.createIcons) window.lucide.createIcons();
  }

  async function runRemotePrediction(){
    const m=ensureModal();
    m.hidden=false;
    thinking();
    try{
      const body=payload();
      if(!body.informePoliciaLocal && !body.informeMossos){
        clearInterval(window.__sipdaGeminiBridgeTimer);
        render({resumExecutiu:'Carrega primer informes o dades operatives per generar predicció.',prediccio48h:[],patronsDetectats:[],recomanacioComandament:'Pujar informes PL/ME i repetir la predicció 48H.'});
        return;
      }
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok) throw new Error(data?.error||'Error endpoint '+response.status);
      setTimeout(()=>render(data),1200);
    }catch(error){
      clearInterval(window.__sipdaGeminiBridgeTimer);
      const fallback=window.SIPDA_PREDICCIO_48H?.analyse?window.SIPDA_PREDICCIO_48H.analyse():null;
      const rows=(fallback?.scenarios||[]).map(s=>({risc:s.risk,zona:(s.topZones||[]).map(x=>x[0]).join(' · '),franja:(s.topBands||[]).map(x=>x[0]).join(' · '),prioritat:s.priority==='high'?'Alta':s.priority==='medium'?'Mitjana':'Baixa',probabilitat:s.probability,impacte:s.impacte||s.impact,prediccio:s.prediction,accioPreventiva:s.action,baseDocumental:(s.count||0)+' serveis acumulats'}));
      render({motor:'SIPDA local fallback',model:'heuristic',resumExecutiu:'No s’ha pogut connectar amb l’endpoint IA. SIPDA mostra una predicció local de contingència.',prediccio48h:rows,patronsDetectats:['Fallback local','Endpoint no disponible'],recomanacioComandament:'Revisar configuració de Cloudflare Pages Function /api/prediccio48h.'});
    }
  }

  function intercept(){
    document.addEventListener('click',function(e){
      const b=e.target?.closest?.('#sipdaPrediction48Button');
      if(!b) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      runRemotePrediction();
    },true);
    window.SIPDA_GEMINI_BRIDGE={build:BUILD,endpoint:ENDPOINT,run:runRemotePrediction};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',intercept);
  else intercept();
})();
