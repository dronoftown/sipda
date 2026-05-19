/* SIPDA v7 · Address Final Guard
   Blindaje final para que predicciones, zonas, timeline y mapa no hereden
   "Adreça no detectada" cuando el PDF sí contiene Via 1 / Adreça / Loc / Zona.
*/
(function(){
  const BUILD='address-final-guard-2026-05-20';
  const STORAGE_KEY='sipda.v7.history.datasets';
  const BAD=/adre[cç]a\s+no\s+detectada|ubicaci[oó]\s+no\s+detectada|no\s+determinat|sense\s+zona|zona\s+operativa$/i;
  const STREET=/^(Avinguda|Carrer|Plaça|Passeig|Carretera|Rambla|Passatge|Travessera|Camí|Urbanització)\b/i;
  const ZONE=/(Platja d['’]Aro|Castell d['’]Aro|S['’]Agaró|S'Agaró|Centre|Mas Nou|Mas Semi|Politur|Fanals|Port d['’]Aro|Ridaura|Estanys|Costa Brava)/i;

  function raw(v){return String(v||'').replace(/\r/g,' ').replace(/\n+/g,' ').replace(/[\t ]+/g,' ').trim();}
  function safeLine(v){try{return typeof line==='function'?line(v):raw(v);}catch(e){return raw(v);}}
  function escText(v){try{return typeof esc==='function'?esc(v):String(v||'');}catch(e){return String(v||'');}}
  function clean(v){
    return raw(v)
      .replace(/^\s*(?:localitzaci[oó]|via\s*1|via|adre[cç]a|adreca|ubicaci[oó]|ubicacio|lloc|lloc\s+detall|zona|sector|loc)\s*:?\s*/i,'')
      .replace(/\s+·\s+(?:ubicaci[oó]\s+protegida|n[uú]mero\s+no\s+detectat)\s*$/i,'')
      .replace(/\s*,\s*/g,', ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function normalizeStreet(value){
    let v=clean(value);
    if(!v)return '';
    const rules=[
      [/^(?:AV|AV\.|AVDA|AVDA\.|AVGDA|AVGDA\.|AVINGUDA)\s+/i,'Avinguda '],
      [/^(?:CL|CL\.|C|C\.|CR|CR\.|CARRER)\s+/i,'Carrer '],
      [/^(?:PL|PL\.|PÇA|PCA|PLAÇA|PLACA)\s+/i,'Plaça '],
      [/^(?:PS|PS\.|PG|PG\.|PASSEIG)\s+/i,'Passeig '],
      [/^(?:CTRA|CTRA\.|CARRETERA)\s+/i,'Carretera '],
      [/^(?:RBLA|RBLA\.|RAMBLA)\s+/i,'Rambla '],
      [/^(?:PTGE|PTGE\.|PASSATGE)\s+/i,'Passatge '],
      [/^(?:TRAV|TRAV\.|TRAVESSERA)\s+/i,'Travessera '],
      [/^(?:CAMI|CAMÍ|CAMI\.|CAMÍ\.)\s+/i,'Camí '],
      [/^(?:URB|URB\.|URBANITZACIÓ|URBANITZACIO)\s+/i,'Urbanització ']
    ];
    rules.some(function(r){if(r[0].test(v)){v=v.replace(r[0],r[1]);return true;}return false;});
    v=v
      .replace(/\bAV\.?\b/gi,'Avinguda')
      .replace(/\bAVDA\.?\b/gi,'Avinguda')
      .replace(/\bAVGDA\.?\b/gi,'Avinguda')
      .replace(/\bCL\.?\b/gi,'Carrer')
      .replace(/\bCR\.?\b/gi,'Carrer')
      .replace(/\bCTRA\.?\b/gi,'Carretera')
      .replace(/\bPG\.?\b/gi,'Passeig')
      .replace(/\bPS\.?\b/gi,'Passeig')
      .replace(/\bPÇA\b/gi,'Plaça')
      .replace(/\bPLACA\b/gi,'Plaça')
      .replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró")
      .replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró")
      .replace(/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro")
      .replace(/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro")
      .replace(/\bCOSTA\s+BRAVA\b/gi,'Costa Brava')
      .replace(/\bMAS\s+NOU\b/gi,'Mas Nou')
      .replace(/\bMAS\s+SEMI\b/gi,'Mas Semi')
      .replace(/\bPOLITUR\b/gi,'Politur')
      .replace(/\s+/g,' ')
      .replace(/\s+,/g,',')
      .trim();
    return v;
  }
  function valid(v){v=normalizeStreet(v);return !!v&&!BAD.test(v);}
  function exact(v){v=normalizeStreet(v);return STREET.test(v)?v:'';}
  function zone(v){v=normalizeStreet(v);return ZONE.test(v)?v:'';}
  function extract(text){
    const source=raw(text);
    if(!source)return '';
    const patterns=[
      /\b(?:Via\s*1|Adre[cç]a|Adreca|Ubicaci[oó]|Ubicacio|Lloc|Loc)\s*:?\s*((?:AV|AV\.|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)[^.;|\n]{3,140})/i,
      /\b((?:AV|AV\.|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{3,120})/i,
      /\b(Zona\s+[A-ZÀ-ÿ0-9'’.,\- ]{3,90})/i,
      /\b(S['’]?\s*Agar[oó]|Platja\s+d['’]?Aro|Castell\s+d['’]?Aro|Mas\s+Nou|Mas\s+Semi|Politur|Port\s+d['’]?Aro|Costa\s+Brava)\b/i
    ];
    for(const pattern of patterns){
      const match=source.match(pattern);
      if(match&&match[1])return normalizeStreet(match[1]);
    }
    return '';
  }
  function bestAddress(item){
    const candidates=[
      item&&item.address,
      item&&item.displayAddress,
      item&&item.zone,
      item&&item.location,
      item&&item.detail,
      extract(item&&item.desc),
      extract(item&&item.summary),
      extract(item&&item.rawBlock),
      item&&item.municipality
    ].map(normalizeStreet).filter(valid);

    const street=candidates.map(exact).find(Boolean);
    if(street)return street;
    const area=candidates.map(zone).find(Boolean);
    if(area)return area;
    return candidates[0]||'Ubicació pendent de validar';
  }
  function getData(){try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch(e){}return window.DATA||null;}
  function getCoords(value,item){try{return typeof coords==='function'?coords(value,item&&item.index,item&&item.sourceType):[41.8162,3.0608];}catch(e){return [41.8162,3.0608];}}
  function normalizeService(item){
    if(!item||typeof item!=='object')return item;
    const next=bestAddress(item);
    if(next&&!BAD.test(next)){
      item.zone=next;
      item.displayAddress=next;
      if(!item.address||BAD.test(String(item.address)))item.address=next;
      if(!Array.isArray(item.coordinates)||item.coordinates.length!==2)item.coordinates=getCoords(next,item);
    }
    return item;
  }
  function normalizeDataset(dataset){
    if(!dataset||typeof dataset!=='object')return dataset;
    ['services','hotspots','timeline'].forEach(function(key){
      if(Array.isArray(dataset[key]))dataset[key].forEach(normalizeService);
    });
    if(dataset.summary&&Array.isArray(dataset.services)&&typeof summary==='function'){
      try{dataset.summary=summary(dataset.services,(dataset.source&&dataset.source.reports)||1);}catch(e){}
    }
    return dataset;
  }
  function normalizeMemory(){const d=getData();if(d)normalizeDataset(d);}
  function normalizeHistoryObject(entry){
    if(entry&&entry.dataset)normalizeDataset(entry.dataset);
    else normalizeDataset(entry);
    return entry;
  }
  function normalizeStorage(){
    try{
      const rawValue=localStorage.getItem(STORAGE_KEY);
      if(!rawValue)return;
      const history=JSON.parse(rawValue);
      if(!Array.isArray(history))return;
      const before=JSON.stringify(history);
      history.forEach(normalizeHistoryObject);
      if(JSON.stringify(history)!==before)localStorage.setItem(STORAGE_KEY,JSON.stringify(history));
    }catch(e){}
  }
  function cleanVisible(){
    document.querySelectorAll('#sourcePredictionGrid p,#sourcePredictionGrid small,#hotZones strong,#hotZones p,#timelineRows strong,#aiFeed span').forEach(function(el){
      if(BAD.test(el.textContent||'')){
        el.textContent=(el.textContent||'').replace(BAD,'Ubicació pendent de validar');
      }
    });
  }

  const previousBuild=typeof build==='function'?build:(typeof window.build==='function'?window.build:null);
  function finalBuild(o){
    const src=o||{};
    const z=bestAddress(src);
    const cr=getCoords(z,src);
    return {
      id:src.prefix+'-'+src.serviceId+'-'+src.index,
      serviceId:src.serviceId,
      time:typeof time==='function'?time(src.dateTime):'--:--',
      title:safeLine(src.title).slice(0,160),
      category:src.cat,
      priority:src.pr,
      score:typeof score==='function'?score(src.pr):3,
      zone:z,
      displayAddress:z,
      address:z,
      summary:safeLine(src.desc).slice(0,520),
      sourceType:src.sourceType,
      sourceLabel:typeof sName==='function'?sName(src.sourceType):src.sourceType,
      sourceBadge:src.sourceType==='PL'?'PL':src.sourceType==='MOSSOS'?'ME':'--',
      coordinates:cr
    };
  }
  try{build=finalBuild;}catch(e){}window.build=finalBuild;

  const previousSave=typeof save==='function'?save:null;
  if(previousSave){try{save=function(history){if(Array.isArray(history))history.forEach(normalizeHistoryObject);return previousSave(history);};window.save=save;}catch(e){}}

  const previousMerge=typeof merge==='function'?merge:null;
  if(previousMerge){try{merge=function(history){if(Array.isArray(history))history.forEach(normalizeHistoryObject);const merged=previousMerge(history);return normalizeDataset(merged);};window.merge=merge;}catch(e){}}

  const previousRender=typeof render==='function'?render:(typeof window.render==='function'?window.render:null);
  function renderAddressSafe(){
    normalizeStorage();
    normalizeMemory();
    if(previousRender)previousRender.apply(this,arguments);
    normalizeMemory();
    cleanVisible();
  }
  try{render=renderAddressSafe;}catch(e){}window.render=renderAddressSafe;

  document.addEventListener('DOMContentLoaded',function(){
    normalizeStorage();
    setTimeout(function(){normalizeMemory();cleanVisible();},250);
    setTimeout(function(){normalizeMemory();cleanVisible();},1200);
    setTimeout(function(){normalizeMemory();cleanVisible();},2500);
  });

  window.SIPDA_ADDRESS_FINAL={
    active:true,
    build:BUILD,
    previousBuild:!!previousBuild,
    bestAddress:bestAddress,
    normalize:normalizeMemory,
    normalizeStorage:normalizeStorage,
    testExtract:extract
  };
})();
