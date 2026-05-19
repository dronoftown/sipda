/* SIPDA v7 · locked intelligence summary panel
   Restores the executive IA block: Origen dels informes, Lectura executiva, Patró principal, Recomanació.
*/
(function(){
  const BUILD='locked-ai-summary-2026-05-20';
  const originalRender=typeof window.render==='function'?window.render:null;

  function safe(value){
    return typeof esc==='function'?esc(value):String(value||'').replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]});
  }
  function list(){return Array.isArray(window.DATA&&window.DATA.services)?window.DATA.services:[]}
  function risk(){return (window.DATA&&window.DATA.summary&&window.DATA.summary.risk)||'low'}
  function sourceStats(){return (window.DATA&&window.DATA.sourceStats)||{PL:0,MOSSOS:0,ALTRES:0}}
  function countBy(key){return list().reduce(function(acc,item){const k=item[key]||'Altres';acc[k]=(acc[k]||0)+1;return acc},{})}
  function topEntry(obj){return Object.entries(obj).sort(function(a,b){return b[1]-a[1]})[0]||['sense patró dominant',0]}
  function priorityCount(p){return list().filter(function(item){return item.priority===p}).length}
  function topZones(n){
    const map=new Map();
    list().forEach(function(item){
      const zone=item.zone||'zona operativa';
      const current=map.get(zone)||{zone:zone,count:0,score:0};
      current.count+=1;
      current.score+=item.score||0;
      map.set(zone,current);
    });
    return Array.from(map.values()).sort(function(a,b){return b.score-a.score||b.count-a.count}).slice(0,n||3);
  }
  function timePattern(){
    const buckets={mati:0,tarda:0,nit:0};
    list().forEach(function(item){
      const match=String(item.time||'').match(/(\d{1,2})/);
      if(!match)return;
      const h=Number(match[1]);
      if(h>=6&&h<14)buckets.mati++;
      else if(h>=14&&h<21)buckets.tarda++;
      else buckets.nit++;
    });
    const top=Object.entries(buckets).sort(function(a,b){return b[1]-a[1]})[0];
    if(!top||!top[1])return 'sense franja dominant';
    return top[0]==='mati'?'matí':top[0]==='tarda'?'tarda':'nit / matinada';
  }
  function executiveText(){
    const total=list().length;
    if(!total)return 'Encara no hi ha dades suficients. Carrega informes PL i Mossos a l’històric per generar lectura executiva.';
    const high=priorityCount('high'), medium=priorityCount('medium'), low=priorityCount('low');
    const zones=topZones(3).map(function(z){return z.zone}).join(', ')||'sense zones dominants';
    return 'El dia presenta una càrrega operativa de '+total+' serveis: '+high+' d’alta prioritat, '+medium+' de prioritat mitjana i '+low+' de baixa prioritat. Focus territorial principal: '+zones+'.';
  }
  function patternText(){
    const total=list().length;
    if(!total)return 'Sense patró operatiu consolidat.';
    const cat=topEntry(countBy('category'));
    const franja=timePattern();
    const zones=topZones(2).map(function(z){return z.zone}).join(' i ')||'zones sense concentració clara';
    return 'Patró dominant de '+cat[0]+' amb concentració en franja de '+franja+' i incidència principal a '+zones+'.';
  }
  function recommendationText(){
    const total=list().length;
    if(!total)return 'Mantenir monitoratge i carregar informes per activar recomanació operativa.';
    const high=priorityCount('high'), medium=priorityCount('medium');
    const zones=topZones(2).map(function(z){return z.zone}).join(' i ')||'zones principals';
    if(high>0)return 'Prioritzar presència preventiva i seguiment tàctic a '+zones+', amb atenció immediata als serveis de prioritat alta i coordinació PL/ME.';
    if(medium>=3)return 'Reforçar patrullatge preventiu a '+zones+', controlar recurrències i revisar evolució en les pròximes 48 hores.';
    return 'Mantenir patrullatge ordinari, vigilància preventiva i seguiment de punts recurrents.';
  }
  function renderAiSummary(){
    const feed=document.getElementById('aiFeed');
    if(!feed)return;
    const st=sourceStats();
    const dotRisk=risk()==='high'?'high':risk()==='medium'?'medium':'neutral';
    feed.innerHTML=''
      +'<div class="feed-item"><i class="feed-signal neutral"></i><div><strong>Origen dels informes</strong><span>PL: '+(st.PL||0)+' serveis · ME: '+(st.MOSSOS||0)+' serveis · Altres: '+(st.ALTRES||0)+'</span></div></div>'
      +'<div class="feed-item"><i class="feed-signal '+dotRisk+'"></i><div><strong>Lectura executiva</strong><span>'+safe(executiveText())+'</span></div></div>'
      +'<div class="feed-item"><i class="feed-signal medium"></i><div><strong>Patró principal</strong><span>'+safe(patternText())+'</span></div></div>'
      +'<div class="feed-item"><i class="feed-signal neutral"></i><div><strong>Recomanació</strong><span>'+safe(recommendationText())+'</span></div></div>';
  }

  window.render=function(){
    if(originalRender)originalRender.apply(this,arguments);
    renderAiSummary();
  };
  window.SIPDA_AI_SUMMARY_LOCK={locked:true,build:BUILD,render:renderAiSummary};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderAiSummary,350);setTimeout(renderAiSummary,1200)});
})();
