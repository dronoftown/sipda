/* SIPDA v7 · normalització de noms de carrers
   Evita mostrar abreviatures crues dels informes: AV, CL, C, PL, PS, PG, CTRA, ZO...
   S'aplica a dades noves i també a l'històric local ja carregat en memòria.
*/
(function(){
  const BUILD='street-normalizer-2026-05-20';
  const STORAGE_KEY='sipda.v7.history.datasets';
  const originalRender=typeof render==='function'?render:(typeof window.render==='function'?window.render:null);

  const replacements=[
    [/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró"],
    [/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró"],
    [/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro"],
    [/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro"],
    [/\bCOSTA\s+BRAVA\b/gi,'Costa Brava'],
    [/\bSANTIAGO\s+RUSI[NÑ]OL\b/gi,'Santiago Rusiñol'],
    [/\bPAU\s+CASALS\b/gi,'Pau Casals'],
    [/\bMAS\s+NOU\b/gi,'Mas Nou'],
    [/\bMAS\s+SEMI\b/gi,'Mas Semi'],
    [/\bPOLITUR\b/gi,'Politur']
  ];

  function getData(){
    try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch(e){}
    return window.DATA||null;
  }
  function cleanBase(value){
    return String(value||'')
      .replace(/\r/g,' ')
      .replace(/\n+/g,' ')
      .replace(/[\t ]+/g,' ')
      .replace(/^\s*(?:via\s*1|via|adreça|adreca|ubicació|ubicacio|lloc|lloc\s+detall|zona|sector)\s*:\s*/i,'')
      .replace(/\s*,\s*/g,', ')
      .trim();
  }
  function expandPrefix(value){
    let v=cleanBase(value);
    const protectedSuffix=/\s+·\s+ubicaci[oó]\s+protegida\s*$/i.test(v);
    v=v.replace(/\s+·\s+ubicaci[oó]\s+protegida\s*$/i,'').trim();

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
      [/^(?:URB|URB\.|URBANITZACIO|URBANITZACIÓ)\s+/i,'Urbanització '],
      [/^(?:ZO|ZO\.|ZONA)\s+/i,'Zona ']
    ];
    rules.some(function(rule){
      if(rule[0].test(v)){v=v.replace(rule[0],rule[1]);return true;}
      return false;
    });

    replacements.forEach(function(pair){v=v.replace(pair[0],pair[1]);});
    v=v.replace(/\bAV\.?\b/gi,'Avinguda')
       .replace(/\bAVDA\.?\b/gi,'Avinguda')
       .replace(/\bCL\.?\b/gi,'Carrer')
       .replace(/\bCTRA\.?\b/gi,'Carretera')
       .replace(/\bPG\.?\b/gi,'Passeig')
       .replace(/\bPS\.?\b/gi,'Passeig')
       .replace(/\bPÇA\b/gi,'Plaça')
       .replace(/\bZO\.?\b/gi,'Zona');

    v=v.replace(/\s+/g,' ').replace(/\s+,/g,',').trim();
    return protectedSuffix?(v+' · ubicació protegida'):v;
  }
  function normalizeService(item){
    if(!item||typeof item!=='object')return item;
    ['zone','displayAddress','address','location','detail'].forEach(function(key){
      if(item[key])item[key]=expandPrefix(item[key]);
    });
    return item;
  }
  function normalizeDataset(dataset){
    if(!dataset||typeof dataset!=='object')return dataset;
    ['services','hotspots','timeline'].forEach(function(key){
      if(Array.isArray(dataset[key]))dataset[key].forEach(normalizeService);
    });
    return dataset;
  }
  function normalizeMemory(){
    const d=getData();
    if(d)normalizeDataset(d);
  }
  function normalizeStorage(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return;
      const history=JSON.parse(raw);
      if(!Array.isArray(history))return;
      let changed=false;
      history.forEach(function(entry){
        const before=JSON.stringify(entry);
        if(entry&&entry.dataset)normalizeDataset(entry.dataset);
        else normalizeDataset(entry);
        if(JSON.stringify(entry)!==before)changed=true;
      });
      if(changed)localStorage.setItem(STORAGE_KEY,JSON.stringify(history));
    }catch(e){}
  }
  function normalizeVisibleText(){
    document.querySelectorAll('#aiFeed span,#hotZones strong,#hotZones p,#timelineRows strong,#timelineRows .event-title span,#sourcePredictionGrid p').forEach(function(el){
      const cleaned=expandPrefix(el.textContent);
      if(cleaned&&cleaned!==el.textContent)el.textContent=cleaned;
    });
  }
  function renderStreetSafe(){
    normalizeMemory();
    if(originalRender)originalRender.apply(this,arguments);
    normalizeMemory();
    normalizeVisibleText();
  }

  try{render=renderStreetSafe;}catch(e){}
  window.render=renderStreetSafe;
  window.SIPDA_STREET_NORMALIZER={build:BUILD,clean:expandPrefix,normalize:normalizeMemory};
  document.addEventListener('DOMContentLoaded',function(){
    normalizeStorage();
    setTimeout(function(){normalizeMemory();normalizeVisibleText();},300);
    setTimeout(function(){normalizeMemory();normalizeVisibleText();},1300);
  });
})();