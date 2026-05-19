/* SIPDA v7 hotfix: robust origin detection, block splitting, satellite map, modal layering and post-login map sizing. */
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

function sipdaCompact(value){return norm(String(value||'')).replace(/\s+/g,'')}
function sipdaHeaderText(text,file){return norm(`${file||''}\n${String(text||'').slice(0,6500)}`)}

function detect(text,file){
  const head=sipdaHeaderText(text,file);
  const full=norm(`${file||''}\n${text||''}`);
  const compact=sipdaCompact(`${file||''}\n${text||''}`);

  const plStrong=(
    /\bpolicia\s+local\b/.test(head)||
    /\bpolicia\s+local\s+castell/.test(head)||
    /\bcastell\s*-?\s*platja\s+d\s*aro\b/.test(head)||
    /\bcastell\s+d\s*aro\s+platja\s+d\s*aro\b/.test(head)||
    /\bajuntament\s+de\s+castell\b/.test(head)||
    /\bajuntament\s+de\s+platja\b/.test(head)||
    /\bnum\.?\s+servei\b/.test(head)||
    /\bnum\.?\s+servicio\b/.test(head)||
    /\bn[uú]m\.?\s+servei\b/.test(head)||
    /\bdesti\s*:?\s*policia\s+local\b/.test(full)||
    /\bdestino\s*:?\s*policia\s+local\b/.test(full)||
    /secretariapolicia@platjadaro\.com/.test(full)||
    compact.includes('policialocal')||
    compact.includes('castellplatjadaro')||
    compact.includes('castellplatjadaroisagaro')
  );

  if(plStrong)return 'PL';

  const mossosStrong=(
    /\bmossos\s+d[' ]?esquadra\b/.test(head)||
    /\bpolicia\s+de\s+la\s+generalitat\b/.test(head)||
    /\bcos\s+de\s+mossos\b/.test(head)||
    /\bpg\s*-?\s*me\b/.test(head)||
    /\busc\s+sant\s+feliu\s+de\s+guixols\b/.test(head)||
    /\bunitat\s+de\s+seguretat\s+ciutadana\b/.test(head)&&/sant\s+feliu\s+de\s+guixols/.test(head)||
    compact.includes('uscsantfeliudeguixols')||
    compact.includes('mossosdesquadra')||
    compact.includes('policiadelageneralitat')
  );

  if(mossosStrong)return 'MOSSOS';

  const plSignals=[/\bpolicia\s+local\b/,/\bajuntament\b/,/\bvia\s+1\b/,/\bdia\s+i\s+hora\b/,/\bnivell\s+prioritat\b/,/\brequeriment\b/,/\bnoticia\b/,/\bnoticia\b/];
  const meSignals=[/\bmossos\b/,/\busc\b/,/\bcodi\s*:\s*\d{5,}\b/,/\btitular\s*:/,/\bresponsable\s*:/,/\bcronologia\s+dels\s+fets\b/];
  const plScore=plSignals.reduce((n,re)=>n+(re.test(full)?1:0),0);
  const meScore=meSignals.reduce((n,re)=>n+(re.test(full)?1:0),0);

  if(plScore>=2&&plScore>=meScore)return 'PL';
  if(meScore>=2)return 'MOSSOS';
  return 'ALTRES';
}

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
    .split(/(?=\n?\s*(?:Dia i hora:|Núm\. Servei:|Núm\.\s*Servei:|Num\. Servei:|Num\.\s*Servicio:|Servei:|Servicio:|Incident:))/i)
    .map(part=>part.trim())
    .filter(part=>part.length>80);
  if(byService.length)return byService;
  return cleaned.split(/\n\s*\n/g).map(part=>part.trim()).filter(part=>part.length>80);
}

const sipdaV7OriginalParse=typeof parse==='function'?parse:null;
function parse(text,file){
  const type=detect(text,file);
  const sourceType=type==='MOSSOS'?'MOSSOS':type==='PL'?'PL':'ALTRES';
  const parts=blocks(text,sourceType);
  const services=parts.map((block,index)=>parseBlock(block,index,sourceType)).filter(Boolean).map(item=>({
    ...item,
    sourceType,
    sourceLabel:sName(sourceType),
    sourceBadge:sourceType==='PL'?'PL':sourceType==='MOSSOS'?'ME':'--'
  }));

  if(!services.length&&sipdaV7OriginalParse){
    const fallback=sipdaV7OriginalParse(text,file);
    fallback.source.sourceType=sourceType;
    fallback.source.origin=sName(sourceType);
    fallback.services=(fallback.services||[]).map(item=>({...item,sourceType,sourceLabel:sName(sourceType),sourceBadge:sourceType==='PL'?'PL':sourceType==='MOSSOS'?'ME':'--'}));
    fallback.hotspots=fallback.services.filter(item=>item.priority!=='low');
    fallback.timeline=[...fallback.services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,60);
    fallback.summary=summary(fallback.services,1);
    fallback.sourceStats=stats(fallback.services);
    return fallback;
  }

  const dataset={
    key:`${file}-${Date.now()}-${services.length}`,
    addedAt:new Date().toISOString(),
    source:{document:file,origin:sName(sourceType),sourceType,reports:1,privacy:'Importació local. El PDF no puja a servidor.'},
    services,
    hotspots:services.filter(item=>item.priority!=='low'),
    timeline:[...services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,60)
  };
  dataset.summary=summary(services,1);
  dataset.sourceStats=stats(services);
  return dataset;
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
