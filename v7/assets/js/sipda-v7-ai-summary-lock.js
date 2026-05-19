/* SIPDA v7 · locked intelligence card
   Targeta Intel·ligència SIPDA basada exclusivament en els dos PDF carregats.
   Blocs: Lectura executiva · Patró principal · Recomanació.
*/
(function(){
  const BUILD='intelligence-card-pdf-only-2026-05-20';
  const originalRender=typeof render==='function'?render:(typeof window.render==='function'?window.render:null);

  function data(){
    try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch(e){}
    return window.DATA||{};
  }
  function services(){
    const d=data();
    return Array.isArray(d.services)?d.services:[];
  }
  function reportsCount(){
    const d=data();
    if(Array.isArray(d.reports)&&d.reports.length)return d.reports.length;
    return Number((d.source&&d.source.reports)||0);
  }
  function safe(value){
    return typeof esc==='function'?esc(value):String(value||'').replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]});
  }
  function scorePriority(p){return p==='high'?9:p==='medium'?6:3;}
  function labelPriority(p){return p==='high'?'alta':p==='medium'?'mitjana':'baixa';}
  function stats(){
    const d=data();
    const base=(d&&d.sourceStats)||{};
    const calc=services().reduce(function(acc,item){
      const key=item.sourceType||'ALTRES';
      acc[key]=(acc[key]||0)+1;
      return acc;
    },{PL:0,MOSSOS:0,ALTRES:0});
    return {PL:Number(base.PL||calc.PL||0),MOSSOS:Number(base.MOSSOS||calc.MOSSOS||0),ALTRES:Number(base.ALTRES||calc.ALTRES||0)};
  }
  function risk(){
    const d=data();
    if(d.summary&&d.summary.risk)return d.summary.risk;
    const high=services().filter(function(x){return x.priority==='high'}).length;
    const medium=services().filter(function(x){return x.priority==='medium'}).length;
    return high>=2?'high':(high>=1||medium>=4?'medium':'low');
  }
  function countBy(key){
    return services().reduce(function(acc,item){
      const k=item[key]||'Altres';
      acc[k]=(acc[k]||0)+1;
      return acc;
    },{});
  }
  function topEntry(obj){
    return Object.entries(obj).sort(function(a,b){return b[1]-a[1]})[0]||['sense patró dominant',0];
  }
  function priorityCount(p){return services().filter(function(item){return item.priority===p}).length;}
  function topZones(limit){
    const map=new Map();
    services().forEach(function(item){
      const zone=item.zone||'Zona operativa';
      const current=map.get(zone)||{zone:zone,count:0,score:0,high:0,medium:0,low:0,source:{PL:0,MOSSOS:0,ALTRES:0},priority:'low'};
      current.count+=1;
      current.score+=Number(item.score||scorePriority(item.priority));
      if(item.priority==='high')current.high++;else if(item.priority==='medium')current.medium++;else current.low++;
      current.source[item.sourceType||'ALTRES']=(current.source[item.sourceType||'ALTRES']||0)+1;
      if(scorePriority(item.priority)>scorePriority(current.priority))current.priority=item.priority;
      map.set(zone,current);
    });
    return Array.from(map.values()).sort(function(a,b){return b.score-a.score||b.count-a.count}).slice(0,limit||3);
  }
  function timePattern(){
    const buckets={mati:0,tarda:0,vespre:0,nit:0};
    services().forEach(function(item){
      const match=String(item.time||'').match(/(\d{1,2})/);
      if(!match)return;
      const h=Number(match[1]);
      if(h>=6&&h<14)buckets.mati++;
      else if(h>=14&&h<20)buckets.tarda++;
      else if(h>=20&&h<24)buckets.vespre++;
      else buckets.nit++;
    });
    const top=Object.entries(buckets).sort(function(a,b){return b[1]-a[1]})[0];
    if(!top||!top[1])return {label:'sense franja dominant',count:0};
    const labels={mati:'matí',tarda:'tarda',vespre:'vespre',nit:'nit / matinada'};
    return {label:labels[top[0]]||top[0],count:top[1]};
  }
  function sourceLine(){
    const st=stats();
    const reports=reportsCount();
    const parts=[];
    if(st.PL)parts.push('PL '+st.PL);
    if(st.MOSSOS)parts.push('ME '+st.MOSSOS);
    if(st.ALTRES)parts.push('Altres '+st.ALTRES);
    return (reports?reports+' informe(s) carregat(s) · ':'')+(parts.length?parts.join(' · '):'pendent de dades');
  }
  function executiveText(){
    const total=services().length;
    if(!total)return 'Encara no hi ha serveis detectats. Carrega els informes PDF de Policia Local i Mossos d’Esquadra per generar la lectura executiva.';
    const high=priorityCount('high'),medium=priorityCount('medium'),low=priorityCount('low');
    const zones=topZones(3).map(function(z){return z.zone}).join(', ')||'sense zona dominant';
    const src=stats();
    const origin=(src.PL&&src.MOSSOS)?'amb lectura conjunta dels dos cossos':(src.PL?'amb dades carregades de Policia Local':(src.MOSSOS?'amb dades carregades de Mossos d’Esquadra':'amb dades policials carregades'));
    return 'Els PDF carregats mostren '+total+' serveis '+origin+': '+high+' d’alta prioritat, '+medium+' de prioritat mitjana i '+low+' de baixa prioritat. Focus territorial principal: '+zones+'.';
  }
  function patternText(){
    const total=services().length;
    if(!total)return 'Sense patró operatiu perquè encara no hi ha serveis normalitzats dels PDF.';
    const cat=topEntry(countBy('category'));
    const zones=topZones(2);
    const time=timePattern();
    const hasCategoryPattern=cat[1]>=2||cat[1]/Math.max(total,1)>=0.35;
    const hasZonePattern=zones[0]&&(zones[0].count>=2||zones[0].score>=9);
    if(!hasCategoryPattern&&!hasZonePattern&&time.count<2){
      return 'No es detecta un patró operatiu consolidat. Els serveis apareixen dispersos per tipologia, zona i franja horària.';
    }
    const zoneText=zones.length?zones.map(function(z){return z.zone}).join(' i '):'zones sense concentració clara';
    return 'Patró dominant de '+cat[0]+' amb major pressió en franja de '+time.label+' i concentració operativa a '+zoneText+'.';
  }
  function recommendationText(){
    const total=services().length;
    if(!total)return 'Pujar els dos informes PDF i revisar que els serveis quedin normalitzats abans de generar recomanació operativa.';
    const high=priorityCount('high'),medium=priorityCount('medium');
    const zones=topZones(2).map(function(z){return z.zone}).join(' i ')||'les zones amb més recurrència';
    const time=timePattern().label;
    if(high>0){
      return 'Prioritzar presència preventiva i seguiment tàctic a '+zones+', especialment en franja de '+time+', revisant primer els serveis d’alta prioritat detectats als PDF.';
    }
    if(medium>=3){
      return 'Reforçar patrullatge preventiu a '+zones+' i controlar recurrències en franja de '+time+', mantenint lectura conjunta PL/ME sense jerarquitzar cap font.';
    }
    return 'Mantenir patrullatge ordinari, vigilància preventiva i seguiment de punts recurrents, actualitzant la lectura quan s’incorporin nous informes PDF.';
  }
  function css(){
    if(document.getElementById('sipda-intelligence-card-css'))return;
    const style=document.createElement('style');
    style.id='sipda-intelligence-card-css';
    style.textContent='.ai-feed.intelligence-card{gap:0;padding:4px 16px 14px}.ai-feed.intelligence-card .feed-item{grid-template-columns:14px 1fr;padding:13px 0}.ai-feed.intelligence-card .feed-item strong{font-size:12px;text-transform:uppercase;letter-spacing:.05em}.ai-feed.intelligence-card .feed-item span{font-size:12.5px;line-height:1.45;color:#374151}.sipda-ai-meta{border-top:1px solid var(--line);padding:10px 0 0;margin-top:2px;color:var(--muted);font-size:10.5px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}';
    document.head.appendChild(style);
  }
  function renderAiSummary(){
    const feed=document.getElementById('aiFeed');
    if(!feed)return;
    css();
    const dotRisk=risk()==='high'?'high':risk()==='medium'?'medium':'neutral';
    feed.classList.add('intelligence-card');
    feed.innerHTML=''
      +'<div class="feed-item"><i class="feed-signal '+dotRisk+'"></i><div><strong>Lectura executiva</strong><span>'+safe(executiveText())+'</span></div></div>'
      +'<div class="feed-item"><i class="feed-signal medium"></i><div><strong>Patró principal</strong><span>'+safe(patternText())+'</span></div></div>'
      +'<div class="feed-item"><i class="feed-signal neutral"></i><div><strong>Recomanació</strong><span>'+safe(recommendationText())+'</span></div></div>'
      +'<div class="sipda-ai-meta">Fonts PDF: '+safe(sourceLine())+'</div>';
  }

  function lockedRender(){
    if(originalRender)originalRender.apply(this,arguments);
    renderAiSummary();
  }

  try{render=lockedRender;}catch(e){}
  window.render=lockedRender;
  window.SIPDA_AI_SUMMARY_LOCK={locked:true,build:BUILD,render:renderAiSummary};
  document.addEventListener('DOMContentLoaded',function(){css();setTimeout(renderAiSummary,350);setTimeout(renderAiSummary,1200);setTimeout(renderAiSummary,2200);});
})();