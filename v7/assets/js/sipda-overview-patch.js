/* SIPDA v7 · ajuste fino tarjetas overview */
(function(){
  function getServices(){try{const d=typeof DATA!=='undefined'?DATA:{services:[]};return Array.isArray(d.services)?d.services:[]}catch(e){return[]}}
  function apply(){
    const a=getServices();
    const pl=a.filter(x=>x.sourceType==='PL').length;
    const me=a.filter(x=>x.sourceType==='MOSSOS').length;
    const el=document.getElementById('overviewTotalIncidents');
    if(el)el.textContent='PL '+pl+' · ME '+me;
    document.querySelectorAll('.sipda-overview-bottom .mini-kpi-card:nth-child(n+2) span').forEach(x=>{x.textContent='';x.hidden=true;});
  }
  const old=window.updateOverviewCards;
  window.updateOverviewCards=function(){if(typeof old==='function')old.apply(this,arguments);apply();};
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(apply,500);setTimeout(apply,1400);setTimeout(apply,2600);});
})();