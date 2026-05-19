/* SIPDA v7 · predicció policial 48 h basada en PDF */
(function(){
  const BUILD='forecast-48h-pdf-2026-05-20';
  const previousRender=typeof render==='function'?render:(typeof window.render==='function'?window.render:null);
  function D(){try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch(e){}return window.DATA||{};}
  function S(){const d=D();return Array.isArray(d.services)?d.services:[];}
  function esc2(v){return typeof esc==='function'?esc(v):String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function count(p){return S().filter(x=>x.priority===p).length;}
  function hourBand(){const b={mati:0,tarda:0,vespre:0,nit:0};S().forEach(x=>{const m=String(x.time||'').match(/(\d{1,2})/);if(!m)return;const h=+m[1];if(h>=6&&h<14)b.mati++;else if(h>=14&&h<20)b.tarda++;else if(h>=20&&h<24)b.vespre++;else b.nit++;});const top=Object.entries(b).sort((a,b)=>b[1]-a[1])[0]||['sense franja',0];return {mati:'matí',tarda:'tarda',vespre:'vespre',nit:'nit / matinada'}[top[0]]||top[0];}
  function topBy(key,n){const m=new Map();S().forEach(x=>{const k=x[key]||'No determinat';const r=m.get(k)||{name:k,count:0,score:0};r.count++;r.score+=x.priority==='high'?9:x.priority==='medium'?6:3;m.set(k,r);});return [...m.values()].sort((a,b)=>b.score-a.score||b.count-a.count).slice(0,n||3);}
  function model(){
    const services=S(),total=services.length,high=count('high'),medium=count('medium'),low=count('low');
    const q=window.SIPDA_LAST_PDF_QUALITY;
    const quality=q?q.level:'pendent';
    const qualityPenalty=q&&q.score<55?20:q&&q.score<80?8:0;
    let riskScore=Math.min(100,Math.round((high*18+medium*9+low*3)+Math.min(total,25)*2-qualityPenalty));
    if(!total)riskScore=0;
    const level=riskScore>=75?'alt':riskScore>=50?'moderat-alt':riskScore>=30?'moderat':'baix';
    const zones=topBy('zone',3);const cats=topBy('category',2);const band=hourBand();
    const confidence=!total?'baixa':(q&&q.score<55?'baixa':(total>=8&&(!q||q.score>=55)?'alta':'mitjana'));
    const error=confidence==='alta'?'±10%':confidence==='mitjana'?'±15%':'±25%';
    let action='Mantenir patrullatge ordinari i actualitzar la predicció amb nous informes.';
    if(high>0)action='Prioritzar seguiment tàctic dels serveis d’alta prioritat i reforçar presència preventiva a les zones més recurrents.';
    else if(medium>=3)action='Reforçar patrullatge preventiu i control de recurrències en les zones i franges dominants.';
    const reading=total?`Predicció 48 h basada en ${total} serveis extrets dels PDF. Risc ${level} amb concentració principal a ${zones.map(z=>z.name).join(', ')||'sense zona dominant'} i franja dominant de ${band}.`:'Carrega informes PDF per activar la predicció policial 48 h.';
    return {total,high,medium,low,riskScore,level,zones,cats,band,confidence,error,quality,action,reading};
  }
  function renderForecast(){
    const grid=document.getElementById('sourcePredictionGrid');if(!grid)return;
    const m=model();
    grid.innerHTML='<article class="prediction-card pdf48"><div class="prediction-card-head"><div><b class="source-chip other">48H</b><h3>Predicció policial conjunta</h3></div><em class="priority-badge '+(m.riskScore>=75?'high':m.riskScore>=35?'medium':'low')+'">'+esc2(m.level)+'</em></div><div class="prediction-kpis"><span><b>'+m.riskScore+'</b>risc</span><span><b>'+m.error+'</b>marge</span><span><b>'+esc2(m.confidence)+'</b>fiabilitat</span></div><p>'+esc2(m.reading)+'</p><small>Base: informes PDF carregats · qualitat lectura: '+esc2(m.quality)+'. '+esc2(m.action)+'</small></article>'+
      '<article class="prediction-card pdf48-detail"><div class="prediction-card-head"><div><b class="source-chip other">IA</b><h3>Factors detectats</h3></div></div><div class="prediction-kpis"><span><b>'+m.high+'</b>alta</span><span><b>'+m.medium+'</b>mitjana</span><span><b>'+m.low+'</b>baixa</span></div><p><b>Zones:</b> '+esc2(m.zones.map(z=>z.name).join(' · ')||'no determinades')+'</p><small><b>Patró:</b> '+esc2(m.cats.map(c=>c.name).join(' · ')||'no determinat')+' · franja '+esc2(m.band)+'.</small></article>';
  }
  function wrapped(){if(previousRender)previousRender.apply(this,arguments);renderForecast();}
  try{render=wrapped;}catch(e){}window.render=wrapped;
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(renderForecast,500);setTimeout(renderForecast,1500);});
  window.SIPDA_FORECAST_48H={build:BUILD,model,render:renderForecast};
})();