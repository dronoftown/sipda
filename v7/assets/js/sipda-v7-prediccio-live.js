/* SIPDA v7 · predicció 48 h predictiva per escenaris agregats */
(function(){
  const KEY='sipda.v7.history.datasets';
  const LAST_FP_KEY='sipda.v7.prediccio48.lastFingerprint';
  const STEPS=['Llegint novetats PL/ME','Calculant recurrències per tipologia','Creuant zones, franges i prioritats','Projectant escenaris operatius 48 h'];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const badge=p=>'<em class="priority-badge '+p+'">'+(p==='high'?'Alta':p==='medium'?'Mitjana':'Baixa')+'</em>';
  const chip=t=>t==='PL'?'<b class="source-chip pl">PL</b>':t==='MOSSOS'?'<b class="source-chip me">ME</b>':'<b class="source-chip other">--</b>';

  function services(){
    try{if(window.DATA&&Array.isArray(window.DATA.services)&&window.DATA.services.length)return window.DATA.services}catch(e){}
    try{let h=JSON.parse(localStorage.getItem(KEY)||'[]');return h.flatMap(x=>(x.dataset||x).services||[])}catch(e){return[]}
  }
  function sourceOf(s){return s.sourceType||s.sourceBadge||'ALTRES'}
  function serviceKey(s,i){return clean([sourceOf(s),s.serviceId,s.id,s.time,s.title,s.zone||s.address].join('|'))||String(i)}
  function fingerprint(items){
    const raw=items.map((s,i)=>[serviceKey(s,i),s.priority,s.category,s.title,s.summary,s.zone||s.address,s.time].map(clean).join('¬')).join('¶');
    let h=5381;for(let i=0;i<raw.length;i++)h=((h<<5)+h)^raw.charCodeAt(i);
    return (h>>>0).toString(16)+'-'+items.length;
  }
  function zoneOf(s){return clean(s.zone||s.address||s.displayAddress)||'Zona pendent de validar'}
  function bandOf(s){
    let h=Number((String(s.time||'').match(/(\d{1,2})/)||[])[1]);
    if(Number.isNaN(h))return'Franja pendent de validar';
    if(h>=6&&h<14)return'Matí · 06:00-14:00';
    if(h>=14&&h<20)return'Tarda · 14:00-20:00';
    if(h>=20&&h<24)return'Vespre-nit · 20:00-00:00';
    return'Matinada · 00:00-06:00';
  }
  function priorityWeight(p){return p==='high'?9:p==='medium'?5:2}
  function countMap(arr,fn){const m=new Map();arr.forEach(x=>{const k=fn(x)||'No determinat';m.set(k,(m.get(k)||0)+1)});return m}
  function topList(map,n=3){return[...map.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,n)}
  function joinTop(list,fallback='pendent'){return list.length?list.map(([k,c])=>`${k} (${c})`).join(' · '):fallback}

  function riskType(s){
    const t=norm([s.category,s.title,s.summary,s.zone,s.address].join(' '));
    if(/robatori|furt|sostrac|patrimoni|interior de vehicle|vehicle estacionat|forcament|habitatge|danys|ocupacio/.test(t))return'Robatoris / furts / patrimoni';
    if(/alarma|intrusio|salt d.alarma|central receptora|cra/.test(t))return'Alarmes i comprovacions';
    if(/accident|transit|tr[aà]nsit|vmp|vehicle|estacionament|velocitat|alcohol|alcoholemia|drog|control|retencio|cua|circulacio|mobilitat|grua/.test(t))return'Trànsit i seguretat vial';
    if(/baralla|agress|amenac|mol[eè]st|soroll|conviv|conflict|ordre public|oci|botell|inciv|alteracio|discussio/.test(t))return'Convivència i ordre públic';
    if(/assistencial|persona|menor|gent gran|ambulancia|sanitari|desorient|caiguda|benestar|vulnerable|domicili/.test(t))return'Assistencial i proximitat';
    if(/animal|gos|medi ambient|incendi|residu|abocament|platja|zona verda|forestal|sorres|aigua|contaminacio/.test(t))return'Medi ambient i espai públic';
    if(/seguretat ciutadana|identificacio|sospit|droga|estupefaent|armes|control preventiu|patrullatge/.test(t))return'Seguretat ciutadana';
    if(/vigil|seguiment|prevenci|presencia|dissuasi|punt calent|zona calenta/.test(t))return'Vigilància preventiva';
    if(/administrativa|inspeccio|llicencia|ordenanca|terrassa|ocupacio via|comerc/.test(t))return'Policia administrativa';
    return clean(s.category)||'Altres serveis operatius';
  }

  function horizonPhrase(scenario){
    const b=scenario.topBands[0]?.[0]||'franja pendent';
    if(/matinada/i.test(b))return'principalment durant la matinada';
    if(/vespre|nit/i.test(b))return'principalment en franja de vespre-nit';
    if(/tarda/i.test(b))return'principalment durant la tarda';
    if(/matí/i.test(b))return'principalment durant el matí';
    return'en la franja horària dominant dels indicadors acumulats';
  }
  function probabilityLabel(score){return score>=76?'Alta':score>=55?'Mitjana-alta':score>=38?'Mitjana':'Baixa'}
  function impactLabel(s){
    if(s.high>=3)return'Alt';
    if(s.high>=1&&/Robatoris|Convivència|Trànsit|Seguretat ciutadana/.test(s.risk))return'Mitjà-alt';
    if(s.medium>=3)return'Mitjà';
    return'Baix-mitjà';
  }
  function actionFor(risk,zones,bands,priority){
    const z=zones[0]?.[0]||'les zones detectades';
    const b=bands[0]?.[0]||'la franja dominant';
    if(/Robatoris/.test(risk))return`Dispositiu preventiu de patrimoni a ${z}, amb patrullatge discret, vigilància d’aparcaments/accessos i revisió reforçada en ${b}.`;
    if(/Alarmes/.test(risk))return`Preposicionar resposta de comprovació ràpida a ${z}, revisar recurrència d’alarmes i validar punts sensibles en ${b}.`;
    if(/Trànsit/.test(risk))return`Planificar control dinàmic de mobilitat/VMP/vehicles a ${z}, reforçant presència i regulació preventiva en ${b}.`;
    if(/Convivència/.test(risk))return`Incrementar presència preventiva a ${z}, contacte amb establiments/veïnat i resposta ràpida als primers indicadors en ${b}.`;
    if(/Assistencial/.test(risk))return`Mantenir patrulla de proximitat disponible a ${z} i coordinació assistencial si es repeteixen requeriments similars.`;
    if(/Medi ambient/.test(risk))return`Programar comprovació preventiva de ${z}, amb vigilància d’espai públic, animals, residus o zones naturals segons el patró detectat.`;
    if(/Seguretat ciutadana/.test(risk))return`Reforçar patrullatge preventiu i identificacions selectives a ${z}, prioritzant punts de concentració i franja ${b}.`;
    if(/Policia administrativa/.test(risk))return`Programar inspecció preventiva i control d’ordenança a ${z}, evitant concentració d’incidències en ${b}.`;
    return`Assignar seguiment preventiu a ${z} i revisar evolució en el proper torn.`;
  }
  function predictionFor(s){
    const zones=s.topZones.map(x=>x[0]).join(', ')||'zones pendents de validar';
    const bands=s.topBands.map(x=>x[0]).join(' i ')||'franges pendents de validar';
    const hp=horizonPhrase(s);
    if(/Robatoris/.test(s.risk))return`En base a la recurrència acumulada de fets patrimonials, és previsible que en les properes 48 hores es puguin produir nous robatoris, furts o temptatives a ${zones}, ${hp}.`;
    if(/Alarmes/.test(s.risk))return`Els indicadors acumulats apunten a possibles noves activacions d’alarma o comprovacions d’intrusió a ${zones} durant les properes 48 hores, especialment en ${bands}.`;
    if(/Trànsit/.test(s.risk))return`La pressió observada en mobilitat permet preveure noves incidències de trànsit, VMP, estacionaments o vehicles a ${zones}, amb major probabilitat en ${bands}.`;
    if(/Convivència/.test(s.risk))return`La lectura acumulada permet anticipar nous requeriments de convivència, molèsties, conflictes o ordre públic a ${zones}, ${hp}.`;
    if(/Assistencial/.test(s.risk))return`És probable que apareguin nous requeriments assistencials o de proximitat policial a ${zones} durant les properes 48 hores, d’acord amb el patró acumulat.`;
    if(/Medi ambient/.test(s.risk))return`Els serveis acumulats permeten preveure noves incidències vinculades a medi ambient, animals, residus o espai públic a ${zones}, sobretot en ${bands}.`;
    if(/Seguretat ciutadana/.test(s.risk))return`La concentració d’indicadors de seguretat ciutadana fa previsible nous requeriments preventius, identificacions o incidències a ${zones}, especialment en ${bands}.`;
    if(/Policia administrativa/.test(s.risk))return`Es preveu possible reaparició d’incidències administratives o d’ordenança a ${zones} durant les properes 48 hores, segons la recurrència documental.`;
    if(/Vigilància/.test(s.risk))return`La recurrència de punts de vigilància indica necessitat probable de seguiment preventiu a ${zones} durant les properes 48 hores.`;
    return`Els indicadors acumulats permeten preveure nous serveis de ${s.risk.toLowerCase()} a ${zones} durant les properes 48 hores.`;
  }

  function buildScenario(risk,items){
    const zoneCounts=countMap(items,zoneOf);
    const bandCounts=countMap(items,bandOf);
    const sourceCounts=countMap(items,sourceOf);
    const high=items.filter(x=>x.priority==='high').length;
    const medium=items.filter(x=>x.priority==='medium').length;
    const low=items.filter(x=>x.priority==='low').length;
    const severity=items.reduce((a,x)=>a+priorityWeight(x.priority),0);
    const recurrenceBoost=Math.min(24,items.length*5)+Math.min(18,(topList(zoneCounts,1)[0]?.[1]||1)*5)+Math.min(12,(topList(bandCounts,1)[0]?.[1]||1)*3);
    const sourceBoost=sourceCounts.size>1?8:0;
    const score=Math.max(15,Math.min(94,Math.round(24+severity*2.2+recurrenceBoost+sourceBoost)));
    const s={risk,items,count:items.length,high,medium,low,topZones:topList(zoneCounts,3),topBands:topList(bandCounts,2),sources:topList(sourceCounts,3),score};
    s.probability=probabilityLabel(score);
    s.impact=impactLabel(s);
    s.prediction=predictionFor(s);
    s.action=actionFor(risk,s.topZones,s.topBands,high?'high':medium?'medium':'low');
    s.priority=high?'high':medium?'medium':'low';
    s.weight=(high*100)+(medium*45)+(items.length*12)+score;
    return s;
  }

  function analyse(){
    const all=services();
    const fp=fingerprint(all);
    let last='';try{last=localStorage.getItem(LAST_FP_KEY)||'';localStorage.setItem(LAST_FP_KEY,fp)}catch(e){}
    const byRisk=new Map();
    all.forEach(s=>{const r=riskType(s);if(!byRisk.has(r))byRisk.set(r,[]);byRisk.get(r).push(s)});
    const scenarios=[...byRisk.entries()].map(([risk,items])=>buildScenario(risk,items)).sort((a,b)=>b.weight-a.weight||a.risk.localeCompare(b.risk));
    return{
      all,scenarios,fingerprint:fp,changed:last!==fp,
      highScenarios:scenarios.filter(x=>x.priority==='high'),
      stats:{pl:all.filter(x=>sourceOf(x)==='PL').length,me:all.filter(x=>sourceOf(x)==='MOSSOS').length,total:all.length,risks:scenarios.length}
    };
  }

  function style(){
    if($('sipdaPredLiveStyle'))return;
    let s=document.createElement('style');s.id='sipdaPredLiveStyle';
    s.textContent='.is-locked #sipdaPrediction48Button{display:none!important}.sipda-prediction-48-btn{background:#111!important;border-color:#111!important;color:#fff!important}#sipdaPrediction48Modal .modal-card{width:min(1240px,100%);max-height:90vh;overflow:auto}.sipda-pred-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sipda-pred-thinking{min-height:230px;display:grid;place-items:center;text-align:center;background:#fafafa;border:1px solid var(--line);padding:22px}.sipda-pred-spinner{width:42px;height:42px;border:4px solid #e5e7eb;border-top-color:#111;margin:0 auto 12px;animation:sipdaSpin .8s linear infinite}.sipda-pred-table-wrap{overflow:auto;border:1px solid var(--line);background:#fff}.sipda-pred-table{width:100%;min-width:1080px;border-collapse:collapse}.sipda-pred-table th{padding:12px;border-bottom:1px solid var(--line);background:#fafafa;color:var(--muted);font-size:10px;text-align:left;text-transform:uppercase;font-weight:950}.sipda-pred-table td{padding:12px;border-bottom:1px solid var(--line);vertical-align:top;font-size:12px;line-height:1.38}.sipda-pred-empty{padding:18px;border:1px dashed var(--line);background:#fafafa;color:var(--muted);font-weight:750}.sipda-doc-base{display:block;margin-top:6px;color:var(--muted);font-size:11px}.sipda-pred-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.sipda-pred-meta span{font-size:11px;font-weight:850;background:#f4f4f5;border:1px solid var(--line);padding:5px 7px}.sipda-pred-alert{padding:10px 12px;background:#f7fbff;border:1px solid rgba(0,84,166,.18);font-weight:800;color:#0f172a;margin-bottom:12px}.sipda-pred-hypothesis{font-weight:850;color:#111827}.sipda-pred-muted{color:var(--muted);font-size:11px;font-weight:750}@keyframes sipdaSpin{to{transform:rotate(360deg)}}@media(max-width:760px){.sipda-pred-board{grid-template-columns:1fr}#sipdaPrediction48Modal.modal{align-items:end;padding:0}#sipdaPrediction48Modal .modal-card{width:100%;max-height:92vh}.sipda-pred-table{min-width:980px}}';
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
    m.innerHTML='<div class="modal-card"><header class="modal-head"><div><strong>Predicció operativa 48 h</strong><span>Escenaris futurs calculats sobre recurrència, zona, franja i prioritat · PL + ME</span></div><button id="sipdaPredClose" type="button"><i data-lucide="x"></i></button></header><div class="modal-body"><div id="sipdaPredBody"></div></div><footer class="modal-actions"><button id="sipdaPredClose2" class="btn white" type="button">Tancar</button></footer></div>';
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
    if(!a.scenarios.length)return'<div class="sipda-pred-empty">No hi ha indicadors suficients per projectar escenaris. SIPDA no genera predicció sense novetats carregades.</div>';
    return'<div class="sipda-pred-board">'+a.scenarios.map(s=>'<article class="prediction-card"><div class="prediction-card-head"><div><b class="source-chip other">'+s.count+'</b><h3>'+esc(s.risk)+'</h3></div>'+badge(s.priority)+'</div><p class="sipda-pred-hypothesis">'+esc(s.prediction)+'</p><div class="sipda-pred-meta"><span>Zones: '+esc(joinTop(s.topZones))+'</span><span>Franges: '+esc(joinTop(s.topBands,2))+'</span><span>Prob. '+esc(s.probability)+' · Impacte '+esc(s.impact)+'</span></div><small><b>Decisió recomanada:</b> '+esc(s.action)+'</small><small class="sipda-doc-base"><b>Indicadors:</b> '+s.count+' serveis acumulats · '+s.high+' alta · '+s.medium+' mitjana · '+s.low+' baixa · Fonts '+esc(joinTop(s.sources))+'</small></article>').join('')+'</div>';
  }
  function table(a){
    if(!a.scenarios.length)return'<div class="sipda-pred-empty">SIPDA no força escenaris sense base documental.</div>';
    return'<div class="sipda-pred-table-wrap"><table class="sipda-pred-table"><thead><tr><th>Risc</th><th>Predicció 48 h</th><th>Zones probables</th><th>Franja probable</th><th>Probabilitat</th><th>Impacte</th><th>Acció preventiva</th><th>Base d’indicadors</th></tr></thead><tbody>'+a.scenarios.map(s=>'<tr><td>'+badge(s.priority)+'<br><b>'+esc(s.risk)+'</b></td><td class="sipda-pred-hypothesis">'+esc(s.prediction)+'</td><td>'+esc(joinTop(s.topZones))+'</td><td>'+esc(joinTop(s.topBands,2))+'</td><td><b>'+esc(s.probability)+'</b><br><span class="sipda-pred-muted">'+s.score+'%</span></td><td>'+esc(s.impact)+'</td><td>'+esc(s.action)+'</td><td>'+s.count+' serveis<br><span class="sipda-pred-muted">'+s.high+' alta · '+s.medium+' mitjana · '+s.low+' baixa<br>Fonts: '+esc(joinTop(s.sources))+'</span></td></tr>').join('')+'</tbody></table></div>';
  }
  function render(a){
    let body=$('sipdaPredBody');
    const intro=a.all.length?`SIPDA ha projectat ${a.scenarios.length} escenaris predictius sobre ${a.stats.total} serveis acumulats (${a.stats.pl} PL · ${a.stats.me} ME). La sortida ja no replica novetats: resumeix patrons i anticipa què pot passar en les properes 48 hores.`:'Encara no hi ha novetats carregades per generar predicció.';
    const change=a.changed?'Nova lectura documental detectada. Escenaris 48 h recalculats.':'Mateixa huella documental que l’anàlisi anterior. Escenaris coherents amb els informes actuals.';
    body.innerHTML='<div class="sipda-pred-alert">'+esc(change)+' · Codi lectura: '+esc(a.fingerprint)+'</div><article class="panel"><div class="panel-head compact"><div><h2>Predicció real 48 h per escenaris</h2><p>'+esc(intro)+'</p></div><span class="status-pill">SIPDA IA</span></div><div class="modal-body">'+cards(a)+'</div></article><article class="panel" style="margin-top:14px"><div class="panel-head compact"><div><h2>Matriu predictiva de comandament</h2><p>Què pot passar, on pot passar, quan pot passar i quin dispositiu preventiu cal activar.</p></div><span class="status-pill">'+a.scenarios.length+' escenaris</span></div><div class="modal-body">'+table(a)+'</div></article>';
    if(window.lucide?.createIcons)window.lucide.createIcons();
  }
  function init(){style();modal();mountButton();window.SIPDA_PREDICCIO_48H={open,analyse,build:'scenario-prediction-2026-05-21'}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
