/* SIPDA v7 hotfix: dedicated Mossos parser, stable PL detection, satellite map, modal layering and post-login map sizing. */
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
function sipdaHeaderText(text,file){return norm(`${file||''}\n${String(text||'').slice(0,9000)}`)}
function sipdaClean(value){return line(String(value||'')).replace(/\s+/g,' ').trim()}
function sipdaGet(block,patterns){for(const pattern of patterns){const match=String(block||'').match(pattern);if(match&&match[1])return sipdaClean(match[1])}return''}

function sipdaHasHardPl(text,file){
  const head=sipdaHeaderText(text,file);
  const full=norm(`${file||''}\n${text||''}`);
  const compact=sipdaCompact(`${file||''}\n${text||''}`);
  return (
    /\bpolicia\s+local\b/.test(head)||
    /\bdesti\s*:?\s*policia\s+local\b/.test(full)||
    /\bdestino\s*:?\s*policia\s+local\b/.test(full)||
    /secretariapolicia@platjadaro\.com/.test(full)||
    /\bn[uú]m\.?\s+servei\b/.test(head)||
    /\bnum\.?\s+servei\b/.test(head)||
    /\bnum\.?\s+servicio\b/.test(head)||
    compact.includes('policialocal')
  );
}

function sipdaHasMossosStructure(text,file){
  const head=sipdaHeaderText(text,file);
  const full=norm(`${file||''}\n${text||''}`);
  const compact=sipdaCompact(`${file||''}\n${text||''}`);
  const structureScore=[
    /\bmossos\s+d[' ]?esquadra\b/.test(head)||compact.includes('mossosdesquadra'),
    /\bpolicia\s+de\s+la\s+generalitat\b/.test(head)||compact.includes('policiadelageneralitat'),
    /\bpg\s*-?\s*me\b/.test(head)||compact.includes('pgme'),
    /\busc\s+sant\s+feliu\s+de\s+guixols\b/.test(head)||compact.includes('uscsantfeliudeguixols'),
    /\bcodi\s*:?\s*\d{5,}\b/.test(full),
    /\btitular\s*:/.test(full),
    /\bresponsable\s*:/.test(full),
    /\bcronologia\s+dels\s+fets\s*:/.test(full),
    /\bresultats\s*:/.test(full)&&/\bdata\s+acceptacio\b/.test(full)
  ].filter(Boolean).length;
  return structureScore>=2;
}

function detect(text,file){
  const hasPl=sipdaHasHardPl(text,file);
  const hasMe=sipdaHasMossosStructure(text,file);
  if(hasMe&&!hasPl)return'MOSSOS';
  if(hasPl)return'PL';
  if(hasMe)return'MOSSOS';
  return'ALTRES';
}

function blocks(text,type){
  const cleaned=String(text||'').replace(/\r/g,'\n').trim();
  if(type==='MOSSOS')return sipdaMossosBlocks(cleaned);
  const byService=cleaned
    .split(/(?=\n?\s*(?:Dia i hora:|Núm\. Servei:|Núm\.\s*Servei:|Num\. Servei:|Num\.\s*Servicio:|Servei:|Servicio:|Incident:))/i)
    .map(part=>part.trim())
    .filter(part=>part.length>80);
  if(byService.length)return byService;
  return cleaned.split(/\n\s*\n/g).map(part=>part.trim()).filter(part=>part.length>80);
}

function sipdaMossosBlocks(text){
  const cleaned=String(text||'').replace(/\r/g,'\n');
  const patterns=[
    /(?=\n?\s*(?:[A-ZÀ-ÿ0-9][^\n]{0,160}\s+)?Codi\s*:?\s*\d{5,})/i,
    /(?=\n?\s*Codi\s*:?\s*\d{5,})/i,
    /(?=\n?\s*Inici\s*:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2})/i,
    /(?=\n?\s*Titular\s*:)/i
  ];
  for(const pattern of patterns){
    const parts=cleaned.split(pattern).map(part=>part.trim()).filter(part=>part.length>120);
    const useful=parts.filter(part=>/Codi\s*:?\s*\d{5,}|Titular\s*:|Responsable\s*:|Cronologia dels fets\s*:/i.test(part));
    if(useful.length>1)return useful;
  }
  const codiMatches=[...cleaned.matchAll(/Codi\s*:?\s*\d{5,}/gi)];
  if(codiMatches.length>1){
    return codiMatches.map((match,index)=>cleaned.slice(match.index,index+1<codiMatches.length?codiMatches[index+1].index:cleaned.length).trim()).filter(part=>part.length>80);
  }
  return cleaned.split(/\n\s*\n/g).map(part=>part.trim()).filter(part=>part.length>120&&/Codi\s*:?|Titular\s*:|Responsable\s*:/.test(part));
}

function sipdaMossosTitle(block){
  const first=sipdaClean(String(block||'').split('\n').find(line=>line.trim()&&!/^(Codi|Titular|Responsable|Inici|Final|Loc|Adreça|Resultats|Cronologia)/i.test(line.trim()))||'');
  const titular=sipdaGet(block,[/Titular\s*:\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i]);
  const base=first.replace(/Codi\s*:?\s*\d+.*/i,'').trim();
  return sipdaClean([base,titular].filter(Boolean).join(' · '))||'Servei Mossos importat';
}

function sipdaParseMossosBlock(block,index){
  const code=sipdaGet(block,[/Codi\s*:?\s*(\d{5,})/i])||`MOSSOS-${index+1}`;
  const title=sipdaMossosTitle(block);
  const start=sipdaGet(block,[/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i]);
  const loc=sipdaGet(block,[/Loc\s*:?\s*([^\n]+?)(?:\s+Adreça\s*:|\n|$)/i,/Municipi\s*:?\s*([^\n]+)/i,/Localitat\s*:?\s*([^\n]+)/i]);
  const address=sipdaGet(block,[/Adreça\s*:?\s*([^\n]+)/i,/Adreca\s*:?\s*([^\n]+)/i,/Lloc\s*:?\s*([^\n]+)/i,/Ubicació\s*:?\s*([^\n]+)/i,/Ubicacio\s*:?\s*([^\n]+)/i]);
  const point=sipdaGet(block,[/Punt d'interès\s*:?\s*([^\n]+)/i,/Punt d'interes\s*:?\s*([^\n]+)/i,/Lloc\/Tipus lloc\s*:?\s*([^\n]+)/i,/Zona\s*:?\s*([^\n]+)/i]);
  const description=sipdaGet(block,[
    /(?:Notícia|Noticia|Descripció|Descripcio)\s*:\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc\s*:|\n\s*Data acceptació|\n\s*Data acceptacio|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i,
    /Resultats\s*:\s*([\s\S]*?)(?:\n\s*Cronologia dels fets\s*:|$)/i,
    /Cronologia dels fets\s*:\s*([\s\S]*)$/i
  ])||sipdaClean(block).slice(0,620);
  const cat=category(title,description);
  const pr=priority(title,description,cat);
  return build({
    serviceId:code,
    dateTime:start,
    title,
    address:address||loc,
    detail:point||loc,
    desc:description,
    cat,
    pr,
    sourceType:'MOSSOS',
    index,
    prefix:'me'
  });
}

const sipdaV7OriginalParse=typeof parse==='function'?parse:null;
function parse(text,file){
  const sourceType=detect(text,file);
  if(sourceType==='MOSSOS'){
    const parts=sipdaMossosBlocks(text);
    const services=parts.map((block,index)=>sipdaParseMossosBlock(block,index)).filter(Boolean).map(item=>({
      ...item,
      sourceType:'MOSSOS',
      sourceLabel:sName('MOSSOS'),
      sourceBadge:'ME'
    }));
    const dataset={
      key:`${file}-${Date.now()}-${services.length}`,
      addedAt:new Date().toISOString(),
      source:{document:file,origin:sName('MOSSOS'),sourceType:'MOSSOS',reports:1,privacy:'Importació local. El PDF no puja a servidor.'},
      services,
      hotspots:services.filter(item=>item.priority!=='low'),
      timeline:[...services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,80)
    };
    dataset.summary=summary(services,1);
    dataset.sourceStats=stats(services);
    return dataset;
  }

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
function sipdaScheduleMapFix(reason){[50,180,420,850,1400].forEach(delay=>window.setTimeout(()=>sipdaFixMapSize(reason),delay))}
function initMap(){
  if(!window.L||MAP)return;
  const el=document.getElementById('sipdaMap');
  if(!el)return;
  MAP=L.map('sipdaMap',{zoomControl:true,preferCanvas:true}).setView(CENTER,14);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(MAP);
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.92,attribution:'Transportation &copy; Esri'}).addTo(MAP);
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:.95,attribution:'Labels &copy; Esri'}).addTo(MAP);
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
    const bodyObserver=new MutationObserver(()=>{if(document.body.classList.contains('is-authenticated'))sipdaScheduleMapFix('auth')});
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    const target=document.getElementById('sipdaMap');
    if(window.ResizeObserver&&target){const ro=new ResizeObserver(()=>sipdaScheduleMapFix('resize-observer'));ro.observe(target)}
    window.addEventListener('resize',()=>sipdaScheduleMapFix('window-resize'));
    window.addEventListener('orientationchange',()=>sipdaScheduleMapFix('orientation'));
    if(document.body.classList.contains('is-authenticated'))sipdaScheduleMapFix('startup-authenticated');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arm);else arm();
})();
