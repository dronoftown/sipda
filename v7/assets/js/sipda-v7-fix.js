/* SIPDA v7 hotfix: robust block splitting, satellite map, modal layering and post-login map sizing. */
(function injectModalLayerFix(){
  const old=document.getElementById('sipda-v7-modal-map-fix');
  if(old)old.remove();
  const style=document.createElement('style');
  style.id='sipda-v7-modal-map-fix';
  style.textContent=`
    .modal{z-index:999999!important;position:fixed!important;inset:0!important;isolation:isolate!important;pointer-events:auto!important}
    .modal-card{position:relative!important;z-index:1000000!important;pointer-events:auto!important}
    .modal[hidden]{display:none!important}
    body.import-modal-open .leaflet-container,body.import-modal-open .leaflet-pane,body.import-modal-open .leaflet-control-container{pointer-events:none!important}
    body.import-modal-open .app-shell{filter:blur(1px)}
    .leaflet-container{z-index:1!important;background:#111!important;width:100%!important;height:100%!important;min-height:420px!important}
    #sipdaMap{width:100%!important;min-height:420px!important}
    .leaflet-pane{z-index:1}
    .leaflet-top,.leaflet-bottom{z-index:30!important}
  `;
  document.head.appendChild(style);
})();

function blocks(text,type){
  const cleaned=String(text||'').replace(/\r/g,'\n').trim();
  if(type==='MOSSOS'){
    const mossos=cleaned
      .split(/(?=\n?[^\n]{3,160}\s+Codi\s*:\s*\d{5,})/i)
      .map(part=>part.trim())
      .filter(part=>/Codi\s*:\s*\d{5,}/i.test(part)&&part.length>120);
    if(mossos.length)return mossos;
  }
  const byService=cleaned
    .split(/(?=\n?\s*(?:Dia i hora:|Núm\. Servei:|Num\. Servei:|Servei:|Incident:))/i)
    .map(part=>part.trim())
    .filter(part=>part.length>80);
  if(byService.length)return byService;
  return cleaned.split(/\n\s*\n/g).map(part=>part.trim()).filter(part=>part.length>80);
}

function sipdaFixMapSize(reason){
  if(!MAP)return;
  const el=document.getElementById('sipdaMap');
  if(!el)return;
  const rect=el.getBoundingClientRect();
  if(rect.width<80||rect.height<80)return;
  try{
    MAP.invalidateSize({animate:false,pan:false});
    if(typeof drawMap==='function')drawMap();
  }catch(error){console.warn('SIPDA map resize warning',reason,error)}
}

function sipdaScheduleMapFix(reason){
  [50,180,420,850,1400].forEach(delay=>window.setTimeout(()=>sipdaFixMapSize(reason),delay));
}

function initMap(){
  if(!window.L||MAP)return;
  const el=document.getElementById('sipdaMap');
  if(!el)return;
  MAP=L.map('sipdaMap',{zoomControl:true,preferCanvas:true}).setView(CENTER,14);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19,
    attribution:'Tiles &copy; Esri'
  }).addTo(MAP);

  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19,
    opacity:.92,
    attribution:'Transportation &copy; Esri'
  }).addTo(MAP);

  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19,
    opacity:.95,
    attribution:'Labels &copy; Esri'
  }).addTo(MAP);

  LAYER=L.layerGroup().addTo(MAP);
  sipdaScheduleMapFix('init');
}

function openM(){
  PENDING=null;
  const modal=document.getElementById('importModal');
  if(modal)modal.hidden=false;
  document.body.classList.add('import-modal-open');
  const preview=document.getElementById('importPreview');
  const progress=document.getElementById('importProgress');
  if(preview)preview.innerHTML='';
  if(progress)progress.style.width='0';
  ['applyPanel','addHistory'].forEach(id=>{const btn=document.getElementById(id);if(btn)btn.disabled=true});
  if(typeof status==='function')status('importStatus','Preparat per llegir informe.');
}

function closeM(){
  const modal=document.getElementById('importModal');
  if(modal)modal.hidden=true;
  document.body.classList.remove('import-modal-open');
  sipdaScheduleMapFix('close-modal');
}

(function watchAuthAndLayout(){
  function arm(){
    const bodyObserver=new MutationObserver(()=>{
      if(document.body.classList.contains('is-authenticated'))sipdaScheduleMapFix('auth');
    });
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});

    const target=document.getElementById('sipdaMap');
    if(window.ResizeObserver&&target){
      const ro=new ResizeObserver(()=>sipdaScheduleMapFix('resize-observer'));
      ro.observe(target);
    }

    window.addEventListener('resize',()=>sipdaScheduleMapFix('window-resize'));
    window.addEventListener('orientationchange',()=>sipdaScheduleMapFix('orientation'));
    if(document.body.classList.contains('is-authenticated'))sipdaScheduleMapFix('startup-authenticated');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arm);
  else arm();
})();
