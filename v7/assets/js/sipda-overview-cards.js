/* SIPDA v7 · lógica dinámica de tarjetas superiores */
(function(){
  function D(){try{return typeof DATA!=='undefined'?DATA:{services:[]}}catch(e){return{services:[]}}}
  function S(){const d=D();return Array.isArray(d.services)?d.services:[]}
  function pct(n,t){return t?Math.round((n/t)*100):0}
  function txt(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
  function bar(id,v){const el=document.getElementById(id);if(el)el.style.width=Math.max(0,Math.min(100,v))+'%'}
  function clsPressure(label){return String(label||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function pressure(load,high){const score=load*.58+high*1.25;if(score>=72)return 'Crítica';if(score>=43)return 'Alta';if(score>=18)return 'Moderada';return 'Baixa'}
  function tension(total,high,medium,zones){const score=high*3.5+medium*1.65+total*.18+zones*1.25;if(score>=86)return{label:'TENSIÓ CRÍTICA',angle:180,color:'#7f1d1d'};if(score>=58)return{label:'TENSIÓ ALTA',angle:152,color:'#ef4444'};if(score>=29)return{label:'TENSIÓ MODERADA',angle:119,color:'#f59e0b'};if(score>=12)return{label:'TENSIÓ NORMAL',angle:84,color:'#3b82f6'};return{label:'TENSIÓ BAIXA',angle:56,color:'#22c55e'}}
  function normalizeRiskLevel(value){
    const v=String(value||'low').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(['critical','critica','critic','roja','rojo'].includes(v))return 'critical';
    if(['high','alta','alto'].includes(v))return 'high';
    if(['medium','mitjana','media','moderada','moderat'].includes(v))return 'medium';
    return 'low';
  }
  function riskLabel(level){return level==='critical'?'CRÍTICA':level==='high'?'ALTA':level==='medium'?'MITJANA':'BAIXA'}
  function riskPercent(value,fallback){
    const n=Number(value);
    if(Number.isFinite(n))return Math.max(0,Math.min(100,Math.round(n)))+'%';
    return fallback;
  }
  function ensureMeteoCard(){
    const row=document.querySelector('.sipda-overview-bottom');
    if(!row)return;
    const old=row.querySelector('.mini-kpi-card:nth-child(4)');
    if(!old||old.classList.contains('meteo-kpi-card'))return;
    old.outerHTML=`<article id="meteoAlertCard" class="mini-kpi-card meteo-kpi-card" aria-label="Alertes meteorològiques 48 hores"><div class="meteo-compact-top"><div class="meteo-icon"><i data-lucide="cloud-sun"></i></div><div class="meteo-title"><small>Alertes meteorològiques · 48 h</small><strong id="meteoRiskLabel">Predicció baixa</strong><span>Castell d'Aro · Platja d'Aro · S'Agaró</span></div><b id="meteoRiskBadge" class="meteo-badge low">BAIXA</b></div><div class="meteo-compact-grid"><span class="meteo-factor"><i data-lucide="cloud-rain"></i><b>Pluja</b><small id="meteoRainRisk">0%</small></span><span class="meteo-factor"><i data-lucide="wind"></i><b>Vent</b><small id="meteoWindRisk">0%</small></span><span class="meteo-factor"><i data-lucide="waves"></i><b>Mar</b><small id="meteoSeaRisk">0%</small></span></div></article>`;
    if(window.lucide)window.lucide.createIcons();
  }
  function updateMeteoCard(){
    ensureMeteoCard();
    const label=document.getElementById('meteoRiskLabel');
    const badge=document.getElementById('meteoRiskBadge');
    const rain=document.getElementById('meteoRainRisk');
    const wind=document.getElementById('meteoWindRisk');
    const sea=document.getElementById('meteoSeaRisk');
    const source=window.SIPDA_METEO_48H||null;
    if(source){
      const level=normalizeRiskLevel(source.riskLevel||source.riskLabel||source.riskBadge);
      const shown=riskLabel(level);
      if(label)label.textContent='Predicció '+shown.toLowerCase();
      if(badge){badge.textContent=shown;badge.className='meteo-badge '+level}
      if(rain)rain.textContent=riskPercent(source.rainRisk??source.rainPct??source.plujaRisk,source.rain||'--%');
      if(wind)wind.textContent=riskPercent(source.windRisk??source.windPct??source.ventRisk,source.wind||'--%');
      if(sea)sea.textContent=riskPercent(source.seaRisk??source.seaPct??source.onatgeRisk,source.sea||'--%');
    }else{
      if(label)label.textContent='Predicció baixa';
      if(badge){badge.textContent='BAIXA';badge.className='meteo-badge low'}
      if(rain)rain.textContent='0%';
      if(wind)wind.textContent='0%';
      if(sea)sea.textContent='0%';
    }
  }
  function update(){
    const a=S(),total=a.length;
    const high=a.filter(x=>x.priority==='high').length;
    const medium=a.filter(x=>x.priority==='medium').length;
    const low=Math.max(0,total-high-medium);
    const pl=a.filter(x=>x.sourceType==='PL');
    const me=a.filter(x=>x.sourceType==='MOSSOS');
    const plHigh=pl.filter(x=>x.priority==='high').length;
    const meHigh=me.filter(x=>x.priority==='high').length;
    const plLoad=pct(pl.length,total),meLoad=pct(me.length,total);
    const plHighPct=pct(plHigh,pl.length),meHighPct=pct(meHigh,me.length);
    const riskHigh=pct(high,total),riskMedium=pct(medium,total),riskLow=pct(low,total);
    const zoneCount=new Set(a.map(x=>String(x.zone||'').trim()).filter(Boolean)).size;
    const t=tension(total,high,medium,zoneCount);
    const time=new Date().toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'});
    txt('municipalityTensionLabel',t.label);
    const g=document.getElementById('municipalityGauge');if(g){g.style.setProperty('--gauge-angle',t.angle+'deg');g.style.setProperty('--gauge-color',t.color)}
    txt('overviewUpdatedTime',time);document.querySelectorAll('.overviewUpdatedTimeClone').forEach(x=>x.textContent=time);
    txt('plLoadPct',plLoad+'%');txt('meLoadPct',meLoad+'%');txt('plHighPct',plHighPct+'%');txt('meHighPct',meHighPct+'%');
    const plP=pressure(plLoad,plHighPct),meP=pressure(meLoad,meHighPct);txt('plPressureLabel',plP);txt('mePressureLabel',meP);
    const plPel=document.getElementById('plPressureLabel'),mePel=document.getElementById('mePressureLabel');if(plPel)plPel.className='pressure-dot '+clsPressure(plP);if(mePel)mePel.className='pressure-dot '+clsPressure(meP);
    bar('plLoadBar',plLoad);bar('meLoadBar',meLoad);bar('plHighBar',plHighPct);bar('meHighBar',meHighPct);
    txt('riskHighPct',riskHigh+'%');txt('riskMediumPct',riskMedium+'%');txt('riskLowPct',riskLow+'%');bar('riskHighBar',riskHigh);bar('riskMediumBar',riskMedium);bar('riskLowBar',riskLow);
    txt('overviewTotalServices',total);txt('overviewTotalIncidents','PL '+pl.length+' · ME '+me.length);txt('overviewHighCount',high);txt('overviewMediumCount',medium);txt('overviewLowCount',low);
    updateMeteoCard();
  }
  const old=window.render;if(typeof old==='function'){window.render=function(){old.apply(this,arguments);setTimeout(update,0)}}
  document.addEventListener('DOMContentLoaded',()=>{ensureMeteoCard();setTimeout(update,400);setTimeout(update,1200);setTimeout(update,2200)});
  window.updateOverviewCards=update;
})();