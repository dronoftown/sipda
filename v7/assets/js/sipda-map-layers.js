/* SIPDA v7 · mapa interactivo estable + capas de calor/prioridad
   Corrige el auto-centrado: solo ajusta bounds cuando cambian los datos, nunca al hacer zoom/pan. */
(function(){
  let uiReady=false;
  let interactionLocked=false;
  let lastSignature='';
  const state={heat:true,high:true,medium:true,low:true,pl:true,me:true};
  function D(){try{return typeof DATA!=='undefined'?DATA:{services:[]}}catch(e){return{services:[]}}}
  function M(){try{return typeof MAP!=='undefined'?MAP:null}catch(e){return null}}
  function LG(){try{return typeof LAYER!=='undefined'?LAYER:null}catch(e){return null}}
  function E(v){return typeof esc==='function'?esc(v):String(v||'')}
  function sChipLocal(t){if(typeof sChip==='function')return sChip(t);let c=t==='PL'?'pl':t==='MOSSOS'?'me':'other',l=t==='PL'?'PL':t==='MOSSOS'?'ME':'--';return `<b class="source-chip ${c}">${l}</b>`}
  function pBadgeLocal(p){if(typeof pBadge==='function')return pBadge(p);let l=p==='high'?'Alta':p==='medium'?'Mitjana':'Baixa';return `<em class="priority-badge ${p}">${l}</em>`}
  function pLabel(p){return p==='high'?'Alta':p==='medium'?'Mitjana':'Baixa'}
  function services(){return Array.isArray(D().services)?D().services:[]}
  function signature(){return services().map(x=>[x.id,x.coordinates&&x.coordinates.join(','),x.priority,x.sourceType].join('|')).join('¬')}
  function shouldShow(x){
    if(x.priority==='high'&&!state.high)return false;
    if(x.priority==='medium'&&!state.medium)return false;
    if((!x.priority||x.priority==='low')&&!state.low)return false;
    if(x.sourceType==='PL'&&!state.pl)return false;
    if(x.sourceType==='MOSSOS'&&!state.me)return false;
    return true;
  }
  function ensureUI(){
    if(uiReady)return;
    const panel=document.querySelector('.map-panel');
    if(!panel)return;
    if(!document.getElementById('mapLayerControls')){
      const div=document.createElement('div');
      div.id='mapLayerControls';
      div.className='map-layer-controls';
      div.innerHTML=`
        <button class="map-layer-btn is-active" type="button" data-layer="heat"><i></i>Calor</button>
        <button class="map-layer-btn is-active" type="button" data-layer="high"><i></i>Alta</button>
        <button class="map-layer-btn is-active" type="button" data-layer="medium"><i></i>Mitjana</button>
        <button class="map-layer-btn is-active" type="button" data-layer="low"><i></i>Baixa</button>
        <button class="map-layer-btn is-active" type="button" data-layer="pl"><i></i>PL</button>
        <button class="map-layer-btn is-active" type="button" data-layer="me"><i></i>ME</button>`;
      panel.appendChild(div);
      div.addEventListener('click',e=>{
        const b=e.target.closest('[data-layer]');
        if(!b)return;
        const key=b.dataset.layer;
        state[key]=!state[key];
        b.classList.toggle('is-active',state[key]);
        interactionLocked=true;
        drawMap(false);
      });
    }
    if(!document.getElementById('mapUpdatePill')){
      const pill=document.createElement('div');
      pill.id='mapUpdatePill';
      pill.className='map-update-pill';
      pill.innerHTML='<i></i><span>Mapa interactiu</span>';
      panel.appendChild(pill);
    }
    if(!document.getElementById('mapPointDetail')){
      const card=document.createElement('aside');
      card.id='mapPointDetail';
      card.className='map-point-detail';
      card.hidden=true;
      panel.appendChild(card);
    }
    uiReady=true;
  }
  function bindInteraction(){
    const map=M();
    if(!map||map.__sipdaInteractionBound)return;
    map.__sipdaInteractionBound=true;
    map.on('zoomstart movestart dragstart',()=>{interactionLocked=true;});
  }
  function heatLayer(x){
    if(!state.heat||!window.L||!x.coordinates||x.priority==='low')return null;
    return L.marker(x.coordinates,{interactive:false,zIndexOffset:-500,icon:L.divIcon({className:'',html:`<div class="sipda-heat-dot ${x.priority}"></div>`,iconSize:[70,70],iconAnchor:[0,0]})});
  }
  function pointCard(x){
    const card=document.getElementById('mapPointDetail');
    if(!card)return;
    const priority=x.priority||'low';
    const lat=Array.isArray(x.coordinates)?Number(x.coordinates[0]).toFixed(5):'--';
    const lng=Array.isArray(x.coordinates)?Number(x.coordinates[1]).toFixed(5):'--';
    card.innerHTML=`
      <div class="map-point-head">
        <div class="map-point-head-main">
          <div class="map-point-meta">${sChipLocal(x.sourceType)} ${pBadgeLocal(priority)} <span class="map-point-priority-dot ${priority}"></span></div>
          <div class="map-point-title">${E(x.title||'Servei operatiu')}</div>
        </div>
        <button class="map-point-close" type="button" aria-label="Tancar informació"><i data-lucide="x"></i></button>
      </div>
      <div class="map-point-body">
        <div class="map-point-kpis">
          <span>Hora<b>${E(x.time||'--:--')}</b></span>
          <span>Prioritat<b>${pLabel(priority)}</b></span>
          <span>Origen<b>${E(x.sourceLabel||x.sourceType||'--')}</b></span>
        </div>
        <div class="map-point-section"><small>Zona / ubicació</small><strong>${E(x.zone||'Zona operativa')}</strong></div>
        <div class="map-point-section"><small>Categoria</small><p>${E(x.category||'Sense categoria')}</p></div>
        <div class="map-point-section"><small>Resum del servei</small><p>${E(x.summary||'Sense resum disponible.')}</p></div>
        <div class="map-point-section"><small>Coordenada estimada</small><p>${lat}, ${lng}</p></div>
        <div class="map-point-actions"><button type="button" class="focus" data-map-focus>Centra punt</button><button type="button" data-map-close>Tancar</button></div>
      </div>`;
    card.hidden=false;
    card.querySelector('[data-map-close]')?.addEventListener('click',()=>{card.hidden=true;});
    card.querySelector('.map-point-close')?.addEventListener('click',()=>{card.hidden=true;});
    card.querySelector('[data-map-focus]')?.addEventListener('click',()=>{
      const map=M();
      if(map&&x.coordinates){interactionLocked=true;map.setView(x.coordinates,Math.max(map.getZoom(),16),{animate:true});}
    });
    if(window.lucide)window.lucide.createIcons();
  }
  function markerLayer(x){
    if(!window.L||!x.coordinates)return null;
    const cls=x.sourceType==='PL'?'pl':x.sourceType==='MOSSOS'?'me':'other';
    const lab=x.sourceType==='PL'?'PL':x.sourceType==='MOSSOS'?'ME':'--';
    const priority=x.priority||'low';
    const ic=L.divIcon({className:'',html:`<div class="sipda-marker ${cls} ${priority}"><span class="mk-source">${lab}</span><span class="mk-priority"></span></div>`,iconSize:[34,34],iconAnchor:[17,17]});
    const popup=`<div class="map-popup"><div class="map-priority-title">${sChipLocal(x.sourceType)} ${pBadgeLocal(priority)}</div><div class="map-popup-body"><strong>${E(x.title)}</strong><span class="map-popup-zone">${E(x.zone)}</span><br>${E(x.summary)}</div></div>`;
    const marker=L.marker(x.coordinates,{icon:ic,riseOnHover:true}).bindPopup(popup,{maxWidth:310});
    marker.on('click',()=>{interactionLocked=true;pointCard(x);});
    return marker;
  }
  window.drawMap=function(autoFit){
    ensureUI();
    bindInteraction();
    const map=M(), layer=LG();
    if(!map||!layer)return;
    const sig=signature();
    const dataChanged=sig!==lastSignature;
    lastSignature=sig;
    layer.clearLayers();
    const bounds=[];
    services().forEach(x=>{
      if(!shouldShow(x))return;
      const heat=heatLayer(x); if(heat)heat.addTo(layer);
      const mk=markerLayer(x); if(mk)mk.addTo(layer);
      if(x.coordinates)bounds.push(x.coordinates);
    });
    const canAutofit = bounds.length && dataChanged && !interactionLocked && autoFit!==false;
    if(canAutofit) map.fitBounds(bounds,{padding:[38,38],maxZoom:15,animate:false});
    const pill=document.getElementById('mapUpdatePill');
    if(pill) pill.querySelector('span').textContent = `${bounds.length} punts · clic per veure informació`;
  };
  const oldRender=window.render;
  if(typeof oldRender==='function'){
    window.render=function(){
      oldRender.apply(this,arguments);
      setTimeout(()=>drawMap(true),0);
    };
  }
  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{ensureUI();bindInteraction();drawMap(true);},650);
    setTimeout(()=>{ensureUI();bindInteraction();drawMap(true);},1600);
  });
})();