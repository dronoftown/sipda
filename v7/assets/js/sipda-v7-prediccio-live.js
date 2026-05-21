/* SIPDA v7 · predicció 48 h live documental */
(function(){
  const KEY='sipda.v7.history.datasets';
  const LAST_FP_KEY='sipda.v7.prediccio48.lastFingerprint';
  const STEPS=['Llegint novetats PL/ME','Extraient base documental','Creuant zones, franges i recurrències','Generant matriu 48 h sense plantilla fixa'];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const short=(v,n=170)=>{const s=clean(v);return s.length>n?s.slice(0,n-1).trim()+'…':s};
  const badge=p=>'<em class="priority-badge '+p+'">'+(p==='high'?'Alta':p==='medium'?'Mitjana':'Baixa')+'</em>';
  const chip=t=>t==='PL'?'<b class="source-chip pl">PL</b>':t==='MOSSOS'?'<b class="source-chip me">ME</b>':'<b class="source-chip other">--</b>';
  const prioWeight=p=>p==='high'?3:p==='medium'?2:1;

  function services(){
    try{if(window.DATA&&Array.isArray(window.DATA.services)&&window.DATA.services.length)return window.DATA.services}catch(e){}
    try{
      let h=JSON.parse(localStorage.getItem(KEY)||'[]');
      return h.flatMap(x=>(x.dataset||x).services||[]);
    }catch(e){return[]}
  }
  function src(s){return s.sourceType||s.sourceBadge||'ALTRES'}
  function serviceKey(s,i){return clean([src(s),s.serviceId,s.id,s.time,s.title,s.zone||s.address].join('|'))||String(i)}
  function fingerprint(items){
    const raw=items.map((s,i)=>[serviceKey(s,i),s.priority,s.category,s.title,s.summary,s.zone||s.address,s.time].map(clean).join('¬')).join('¶');
    let h=5381;for(let i=0;i<raw.length;i++)h=((h<<5)+h)^raw.charCodeAt(i);
    return (h>>>0).toString(16)+'-'+items.length;
  }
  function band(s){
    let h=Number((String(s.time||'').match(/(\d{1,2})/)||[])[1]);
    if(Number.isNaN(h))return'Franja pendent de validar';
    if(h>=6&&h<14)return'Matí · 06:00-14:00';
    if(h>=14&&h<20)return'Tarda · 14:00-20:00';
    if(h>=20&&h<24)return'Vespre-nit · 20:00-00:00';
    return'Matinada · 00:00-06:00';
  }
  function countBy(arr,fn){let m=new Map();arr.forEach(x=>{let k=fn(x)||'No determinat';m.set(k,(m.get(k)||0)+1)});return m}
  function topFromMap(m,n=5){return[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n)}
  function riskType(s){
    const t=norm([s.category,s.title,s.summary,s.zone,s.address].join(' '));
    if(/robatori|furt|sostrac|patrimoni|interior de vehicle|vehicle estacionat|forcament|habitatge/.test(t))return'Robatoris / furts';
    if(/alarma|intrusio|salt d.alarma|central receptora/.test(t))return'Alarmes';
    if(/accident|transit|tr[aà]nsit|vmp|vehicle|estacionament|velocitat|alcohol|drog|control|via|retencio/.test(t))return'Trànsit / seguretat vial';
    if(/baralla|agress|amenac|mol[eè]st|soroll|conviv|conflict|ordre public|oci|botell|inciv/.test(t))return'Convivència / ordre públic';
    if(/assistencial|persona|menor|gent gran|ambulancia|sanitari|desorient|caiguda|benestar/.test(t))return'Assistencial / proximitat';
    if(/animal|gos|medi ambient|incendi|residu|abocament|platja|zona verda|forestal/.test(t))return'Medi ambient / espai natural';
    if(/vigil|sospit|seguiment|prevenci|presencia|dissuasi|patrullatge/.test(t))return'Vigilància preventiva';
    return clean(s.category)||'Servei policial detectat';
  }
  function probability(s,zoneCount,riskCount){
    let score=(s.priority==='high'?66:s.priority==='medium'?48:30)+(zoneCount||1)*4+(riskCount||1)*5;
    score=Math.max(18,Math.min(92,score));
    return {score,label:score>=70?'Alta':score>=48?'Mitjana':'Baixa'};
  }
  function impact(s,risk){
    if(s.priority==='high')return /robatori|alarma|conviv|ordre|tr[aà]nsit/i.test(risk)?'Alt':'Mitjà-alt';
    if(s.priority==='medium')return'Mitjà';
    return'Baix-mitjà';
  }
  function what(s,risk,prob){
    const z=clean(s.zone||s.address)||'zona pendent de validar';
    const b=band(s).toLowerCase();
    if(risk==='Robatoris / furts')return`Possible repetició de fets patrimonials o temptatives vinculades a ${z}, especialment en ${b}.`;
    if(risk==='Alarmes')return`Possible nova activació d’alarmes o comprovacions d’intrusió a ${z} durant ${b}.`;
    if(risk==='Trànsit / seguretat vial')return`Possible pressió de mobilitat, incidències de vehicles, VMP o controls necessaris a ${z} en ${b}.`;
    if(risk==='Convivència / ordre públic')return`Possible repunt de requeriments de convivència, molèsties o conflictes a ${z}, principalment en ${b}.`;
    if(risk==='Assistencial / proximitat')return`Possible necessitat de resposta assistencial o policia de proximitat a ${z} en les properes 48 hores.`;
    if(risk==='Medi ambient / espai natural')return`Possible incidència vinculada a espai públic, animals, medi ambient o zona natural a ${z}.`;
    if(risk==='Vigilància preventiva')return`Possible necessitat de seguiment preventiu i presència dissuasiva a ${z}, amb patró detectat en ${b}.`;
    return`Possible nou servei de ${risk.toLowerCase()} a ${z} durant les properes 48 hores.`;
  }
  function action(s,risk){
    const z=clean(s.zone||s.address)||'la zona detectada';
    if(risk==='Robatoris / furts')return`Reforçar patrullatge preventiu i vigilància discreta a ${z}; prioritzar punts d’aparcament, comerç i accessos.`;
    if(risk==='Alarmes')return`Planificar comprovació ràpida d’alarmes recurrents a ${z}, validant accessos, franges i possibles falsos positius.`;
    if(risk==='Trànsit / seguretat vial')return`Activar control dinàmic de trànsit/VMP i presència dissuasiva als eixos sensibles de ${z}.`;
    if(risk==='Convivència / ordre públic')return`Incrementar presència preventiva, contacte amb establiments i resposta ràpida a requeriments de convivència a ${z}.`;
    if(risk==='Assistencial / proximitat')return`Mantenir patrulla de proximitat disponible i coordinació amb recursos assistencials si el servei es reactiva.`;
    if(risk==='Medi ambient / espai natural')return`Programar comprovació preventiva de l’entorn i coordinació municipal si apareixen indicadors repetits.`;
    if(risk==='Vigilància preventiva')return`Mantenir seguiment del punt, presència visible i revisió en el següent torn.`;
    return`Assignar seguiment preventiu al proper torn i actualitzar la lectura amb noves novetats.`;
  }
  function baseDocumental(s){
    const z=clean(s.zone||s.address)||'zona no determinada';
    const title=short(s.title||s.category||'Servei detectat',120);
    const summary=short(s.summary||'',190);
    return [src(s)==='MOSSOS'?"Mossos d'Esquadra":src(s)==='PL'?'Policia Local':'Font no determinada',clean(s.time)||'hora pendent',z,title,summary].filter(Boolean).join(' · ');
  }
  function buildPrediction(s,i,zoneCount,riskCount){
    const risk=riskType(s),prob=probability(s,zoneCount.get(clean(s.zone||s.address)||'Zona no determinada')||1,riskCount.get(risk)||1);
    return {
      id:serviceKey(s,i),source:src(s),priority:s.priority||'low',risk,zone:clean(s.zone||s.address)||'Zona no determinada',band:band(s),probability:prob.label,probScore:prob.score,impact:impact(s,risk),what:what(s,risk,prob),action:action(s,risk),basis:baseDocumental(s),title:short(s.title||risk,130),summary:short(s.summary||'',200),weight:(prioWeight(s.priority||'low')*100)+prob.score
    };
  }
  function groupPredictions(preds){
    const m=new Map();
    preds.forEach(p=>{
      const k=[p.risk,p.zone,p.band].join('|');
      const g=m.get(k)||{risk:p.risk,zone:p.zone,band:p.band,count:0,high:0,medium:0,low:0,items:[],weight:0};
      g.count++;g[p.priority==='high'?'high':p.priority==='medium'?'medium':'low']++;g.items.push(p);g.weight+=p.weight;m.set(k,g);
    });
    return[...m.values()].sort((a,b)=>b.weight-a.weight||b.count-a.count);
  }
  function analyse(){
    const all=services();
    const fp=fingerprint(all);
    let last='';try{last=localStorage.getItem(LAST_FP_KEY)||'';localStorage.setItem(LAST_FP_KEY,fp)}catch(e){}
    const zoneCount=countBy(all,x=>clean(x.zone||x.address)||'Zona no determinada');
    const riskSeed=all.map(riskType);const riskCount=new Map();riskSeed.forEach(r=>riskCount.set(r,(riskCount.get(r)||0)+1));
    const predictions=all.map((s,i)=>buildPrediction(s,i,zoneCount,riskCount)).sort((a,b)=>b.weight-a.weight||a.zone.localeCompare(b.zone));
    return{all,predictions,groups:groupPredictions(predictions),high:predictions.filter(x=>x.priority==='high'),medium:predictions.filter(x=>x.priority==='medium'),low:predictions.filter(x=>x.priority==='low'),fingerprint:fp,changed:last!==fp,stats:{zones:topFromMap(zoneCount,6),risks:topFromMap(riskCount,6),pl:all.filter(x=>src(x)==='PL').length,me:all.filter(x=>src(x)==='MOSSOS').length}};
  }
  function style(){
    if($('sipdaPredLiveStyle'))return;
    let s=document.createElement('style');s.id='sipdaPredLiveStyle';
    s.textContent='.is-locked #sipdaPrediction48Button{display:none!important}.sipda-prediction-48-btn{background:#111!important;border-color:#111!important;color:#fff!important}#sipdaPrediction48Modal .modal-card{width:min(1240px,100%);max-height:90vh;overflow:auto}.sipda-pred-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sipda-pred-thinking{min-height:230px;display:grid;place-items:center;text-align:center;background:#fafafa;border:1px solid var(--line);padding:22px}.sipda-pred-spinner{width:42px;height:42px;border:4px solid #e5e7eb;border-top-color:#111;margin:0 auto 12px;animation:sipdaSpin .8s linear infinite}.sipda-pred-table-wrap{overflow:auto;border:1px solid var(--line);background:#fff}.sipda-pred-table{width:100%;min-width:1180px;border-collapse:collapse}.sipda-pred-table th{padding:12px;border-bottom:1px solid var(--line);background:#fafafa;color:var(--muted);font-size:10px;text-align:left;text-transform:uppercase;font-weight:950}.sipda-pred-table td{padding:12px;border-bottom:1px solid var(--line);vertical-align:top;font-size:12px;line-height:1.35}.sipda-pred-empty{padding:18px;border:1px dashed var(--line);background:#fafafa;color:var(--muted);font-weight:750}.sipda-doc-base{display:block;margin-top:6px;color:var(--muted);font-size:11px}.sipda-pred-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.sipda-pred-meta span{font-size:11px;font-weight:850;background:#f4f4f5;border:1px solid var(--line);padding:5px 7px}.sipda-pred-alert{padding:10px 12px;background:#f7fbff;border:1px solid rgba(0,84,166,.18);font-weight:800;color:#0f172a;margin-bottom:12px}@keyframes sipdaSpin{to{transform:rotate(360deg)}}@media(max-width:760px){.sipda-pred-board{grid-template-columns:1fr}#sipdaPrediction48Modal.modal{align-items:end;padding:0}#sipdaPrediction48Modal .modal-card{width:100%;max-height:92vh}.sipda-pred-table{min-width:980px}}';
    document.head.appendChild(s);
  }
  function mountButton(){
    if($('sipdaPrediction48Button'))return;
    let b=document.createElement('button');b.id='sipdaPrediction48Button';b.className='btn black sipda-prediction-48-btn';b.type='button';b.innerHTML='<i data-lucide="radar"></i>Predicció 48H';
    let clear=$('clearHistory'),actions=document.querySelector('.top-actions');
    if(clear&&clear.parentElement)clear.parentElement.insertBefore(b,clear);else if(actions)actions.appendChild(b);else document.body.appendChild(b);
    b.addEventListener('click',open);if(window.lucide?.createIcons)window.lucide.createIcons();
  }
  function modal(){
    if($('sipdaPrediction48Modal'))return;
    let m=document.createElement('section');m.id='sipdaPrediction48Modal';m.className='modal';m.hidden=true;
    m.innerHTML='<div class="modal-card"><header class="modal-head"><div><strong>Predicció operativa 48 h</strong><span>Matriu dinàmica basada exclusivament en novetats carregades · PL + ME</span></div><button id="sipdaPredClose" type="button"><i data-lucide="x"></i></button></header><div class="modal-body"><div id="sipdaPredBody"></div></div><footer class="modal-actions"><button id="sipdaPredClose2" class="btn white" type="button">Tancar</button></footer></div>';
    document.body.appendChild(m);$('sipdaPredClose')?.addEventListener('click',close);$('sipdaPredClose2')?.addEventListener('click',close);m.addEventListener('click',e=>{if(e.target===m)close()});
  }
  function close(){if(window.__pred48)clearInterval(window.__pred48);let m=$('sipdaPrediction48Modal');if(m)m.hidden=true}
  async function open(){
    modal();let m=$('sipdaPrediction48Modal'),body=$('sipdaPredBody');m.hidden=false;
    body.innerHTML='<div class="sipda-pred-thinking"><div><div class="sipda-pred-spinner"></div><strong>SIPDA està projectant escenaris 48 h</strong><p id="sipdaPredStep">'+STEPS[0]+'</p></div></div>';
    let i=0;window.__pred48=setInterval(()=>{i=(i+1)%STEPS.length;let st=$('sipdaPredStep');if(st)st.textContent=STEPS[i]},760);
    let a=analyse();await new Promise(r=>setTimeout(r,5000));clearInterval(window.__pred48);render(a);
  }
  function cards(a){
    if(!a.groups.length)return'<div class="sipda-pred-empty">No hi ha dades documentals suficients per generar predicció. Carrega informes PL/ME amb serveis o novetats operatives.</div>';
    return'<div class="sipda-pred-board">'+a.groups.map(g=>{
      const top=g.items[0];const p=g.high?'high':g.medium?'medium':'low';
      return'<article class="prediction-card"><div class="prediction-card-head"><div><b class="source-chip other">'+esc(g.count)+'</b><h3>'+esc(g.risk)+'</h3></div>'+badge(p)+'</div><p>'+esc(top.what)+'</p><div class="sipda-pred-meta"><span>'+esc(g.zone)+'</span><span>'+esc(g.band)+'</span><span>'+g.high+' alta · '+g.medium+' mitjana · '+g.low+' baixa</span></div><small><b>Què fer:</b> '+esc(top.action)+'</small><small class="sipda-doc-base"><b>Base:</b> '+esc(top.basis)+'</small></article>';
    }).join('')+'</div>';
  }
  function tableRows(items){
    return items.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+chip(p.source)+'</td><td>'+badge(p.priority)+'<br>'+esc(p.risk)+'</td><td>'+esc(p.what)+'<small class="sipda-doc-base"><b>Servei:</b> '+esc(p.title)+'</small></td><td>'+esc(p.zone)+'</td><td>'+esc(p.band)+'</td><td><b>'+esc(p.probability)+'</b><br><small>'+p.probScore+'%</small></td><td>'+esc(p.impact)+'</td><td>'+esc(p.action)+'</td><td>'+esc(p.basis)+'</td></tr>').join('');
  }
  function table(a){
    if(!a.predictions.length)return'<div class="sipda-pred-empty">SIPDA no força prediccions sense base documental.</div>';
    return'<div class="sipda-pred-table-wrap"><table class="sipda-pred-table"><thead><tr><th>#</th><th>Font</th><th>Risc</th><th>Què pot passar</th><th>Zona</th><th>Franja</th><th>Probabilitat</th><th>Impacte</th><th>Acció preventiva</th><th>Base documental</th></tr></thead><tbody>'+tableRows(a.predictions)+'</tbody></table></div>';
  }
  function render(a){
    let body=$('sipdaPredBody');
    const loaded=a.all.length;
    const highTxt=a.high.length===1?'1 prioritat alta':a.high.length+' prioritats altes';
    const intro=loaded?`SIPDA ha generat ${a.predictions.length} prediccions individualitzades a partir de ${loaded} serveis carregats (${a.stats.pl} PL · ${a.stats.me} ME). S’han detectat ${highTxt}; no s’ha aplicat cap límit fix de resultats.`:'Encara no hi ha novetats carregades per generar predicció.';
    const change=a.changed?'Nova lectura documental detectada. Predicció regenerada.':'Mateixa huella documental que l’anàlisi anterior. Resultat coherent amb els informes actuals.';
    body.innerHTML='<div class="sipda-pred-alert">'+esc(change)+' · Codi lectura: '+esc(a.fingerprint)+'</div><article class="panel"><div class="panel-head compact"><div><h2>Escenaris 48 h generats per dades reals</h2><p>'+esc(intro)+'</p></div><span class="status-pill">SIPDA IA</span></div><div class="modal-body">'+cards(a)+'</div></article><article class="panel" style="margin-top:14px"><div class="panel-head compact"><div><h2>Matriu completa de predicció operativa</h2><p>Sense plantilla fixa: cada fila conserva font, zona, franja, base documental i acció preventiva.</p></div><span class="status-pill">'+a.predictions.length+' prediccions</span></div><div class="modal-body">'+table(a)+'</div></article>';
    if(window.lucide?.createIcons)window.lucide.createIcons();
  }
  function init(){style();modal();mountButton();window.SIPDA_PREDICCIO_48H={open,analyse,build:'live-documental-2026-05-21'}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
