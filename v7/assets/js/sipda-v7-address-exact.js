/* SIPDA v7 · adreça operativa exacta */
(function(){
  const BUILD='exact-address-via1-2026-05-20';
  const originalBuild=typeof build==='function'?build:null;
  const names=[[/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró"],[/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró"],[/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro"],[/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro"],[/\bSANTIAGO\s+RUSI[NÑ]OL\b/gi,'Santiago Rusiñol'],[/\bDELS\s+ESTANYS\b/gi,'dels Estanys']];
  const lowerWords=/^(de|del|dels|la|les|el|els|i)$/i;
  function L(v){return typeof line==='function'?line(v):String(v||'').replace(/\s+/g,' ').trim();}
  function titleWord(w,i){if(/[0-9]/.test(w)||w.includes("'")||w.includes('’'))return w;if(lowerWords.test(w)&&i>0)return w.toLowerCase();if(w===w.toUpperCase()&&w.length>2)return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();return w;}
  function pretty(v){return String(v||'').split(' ').map(titleWord).join(' ').replace(/\bDels Estanys\b/g,'dels Estanys').trim();}
  function clean(v){return L(v).replace(/^\s*(?:localitzaci[oó]|via\s*1|via|adreça|adreca|ubicació|ubicacio|lloc|lloc\s+detall)\s*:?\s*/i,'').replace(/\s+·\s+(?:ubicaci[oó]\s+protegida|número\s+no\s+detectat)\s*$/i,'').replace(/\s*,\s*/g,', ').trim();}
  function expand(v){
    v=clean(v);
    [[/^(?:AV|AV\.|AVDA|AVDA\.|AVGDA|AVGDA\.|AVINGUDA)\s+/i,'Avinguda '],[/^(?:CL|CL\.|C|C\.|CR|CR\.|CARRER)\s+/i,'Carrer '],[/^(?:PL|PL\.|PÇA|PCA|PLAÇA|PLACA)\s+/i,'Plaça '],[/^(?:PS|PS\.|PG|PG\.|PASSEIG)\s+/i,'Passeig '],[/^(?:CTRA|CTRA\.|CARRETERA)\s+/i,'Carretera '],[/^(?:RBLA|RBLA\.|RAMBLA)\s+/i,'Rambla '],[/^(?:PTGE|PTGE\.|PASSATGE)\s+/i,'Passatge '],[/^(?:TRAV|TRAV\.|TRAVESSERA)\s+/i,'Travessera '],[/^(?:CAMI|CAMÍ|CAMI\.|CAMÍ\.)\s+/i,'Camí ']].some(function(r){if(r[0].test(v)){v=v.replace(r[0],r[1]);return true;}return false;});
    names.forEach(function(r){v=v.replace(r[0],r[1]);});
    v=v.replace(/\bAV\.?\b/gi,'Avinguda').replace(/\bAVDA\.?\b/gi,'Avinguda').replace(/\bCL\.?\b/gi,'Carrer').replace(/\bCTRA\.?\b/gi,'Carretera').replace(/\bPG\.?\b/gi,'Passeig').replace(/\bPS\.?\b/gi,'Passeig').replace(/\bPÇA\b/gi,'Plaça');
    return pretty(v.replace(/\s+/g,' ').replace(/\s+,/g,',').trim());
  }
  function hasStreet(v){return /^(Avinguda|Carrer|Plaça|Passeig|Carretera|Rambla|Passatge|Travessera|Camí)\b/i.test(v||'');}
  function hasNo(v){return /(^|[\s,])\d{1,4}([A-Za-zÀ-ÿ]?|\s*[-/]\s*\d{1,4})?($|[\s,])/i.test(' '+String(v||'')+' ');}
  function address(v){v=expand(v);if(!v)return 'Adreça no detectada';if(/^zona\b|^sector\b|^punt\b|^municipi\b/i.test(v))return 'Adreça no detectada';if(hasStreet(v))return v;return hasNo(v)?v:'Adreça no detectada';}
  function rebuild(o){
    const z=address(o&&o.address?o.address:(o&&o.detail?o.detail:''));
    const cr=typeof coords==='function'?coords(z,o.index,o.sourceType):[41.8162,3.0608];
    return {id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:typeof time==='function'?time(o.dateTime):'--:--',title:L(o.title).slice(0,160),category:o.cat,priority:o.pr,score:typeof score==='function'?score(o.pr):3,zone:z,summary:L(o.desc).slice(0,520),sourceType:o.sourceType,sourceLabel:typeof sName==='function'?sName(o.sourceType):o.sourceType,sourceBadge:o.sourceType==='PL'?'PL':o.sourceType==='MOSSOS'?'ME':'--',coordinates:cr};
  }
  try{build=rebuild;window.build=rebuild;}catch(e){}
  window.SIPDA_EXACT_ADDRESS={build:BUILD,format:address,previous:!!originalBuild};
})();