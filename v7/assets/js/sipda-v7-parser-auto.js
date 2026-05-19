/* SIPDA v7 parser auto · lector PL / ME con localización real */
(function(){
  const BUILD='pdf-reader-localitzacio-via1-2026-05-20';

  function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@.\s:_\/-]/g,' ').replace(/\s+/g,' ').trim()}
  function C(v){return N(v).replace(/\s+/g,'')}
  function L(v){return String(v||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim()}
  function one(v){return L(v).replace(/\n/g,' ').replace(/\s+/g,' ').trim()}
  function G(block,patterns){for(const r of patterns){const m=String(block||'').match(r);if(m&&m[1])return one(m[1])}return''}

  const STOP='Dia i hora|N[uú]m\\.?\\s*Servei|Num\\.?\\s*Servei|Servei|Incident|Requeriment|Nivell|Prioritat|Via\\s*1|Via\\s*2|Adre[cç]a|Lloc detall|Lloc|Ubicaci[oó]|Zona|Sector|Municipi|Localitat|Titular|Responsable|Inici|Final|Loc|Resultats|Cronologia|Not[ií]cia|Noticia|Descripci[oó]|Descripcio|Hora inici|Unitat|Estad[ií]stica|Codi';
  const stopRe=new RegExp('\\s+(?:'+STOP+')\\s*:?','i');
  function isLabel(v){return new RegExp('^(?:'+STOP+')\\b','i').test(String(v||'').trim())}
  function cutValue(v){
    v=one(v);
    const m=v.search(stopRe);
    return (m>0?v.slice(0,m):v).replace(/^[:\-\s]+/,'').trim();
  }
  function fieldAny(block,labels){
    const lines=String(block||'').replace(/\r/g,'\n').split('\n').map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++){
      for(const label of labels){
        const re=new RegExp('(?:^|\\b)'+label+'\\s*:?\\s*(.*)$','i');
        const m=lines[i].match(re);
        if(!m)continue;
        const same=cutValue(m[1]||'');
        if(same&&!isLabel(same))return same;
        const parts=[];
        for(let j=i+1;j<Math.min(lines.length,i+6);j++){
          if(isLabel(lines[j]))break;
          parts.push(lines[j]);
          if(parts.join(' ').length>100)break;
        }
        if(parts.length)return cutValue(parts.join(' '));
      }
    }
    const flat=one(block);
    for(const label of labels){
      const re=new RegExp('(?:LOCALITZACI[ÓO]\\s+)?'+label+'\\s*:?\\s*([\\s\\S]{1,160})','i');
      const m=flat.match(re);
      if(m&&m[1])return cutValue(m[1]);
    }
    return'';
  }
  function hasNum(v){return /(^|[\s,])\d{1,4}([A-Za-zÀ-ÿ]?|\s*[-/]\s*\d{1,4})?($|[\s,])/i.test(' '+String(v||'')+' ')}
  function numberFrom(block){return fieldAny(block,['N[uú]m\\.?\\s*Via','Num\\.?\\s*Via','N[uú]mero\\s*Via','Numero\\s*Via','Portal','N[uú]mero','Numero'])}
  function addressFrom(block){
    let road=fieldAny(block,['Via\\s*1','Adre[cç]a','Adreca','Ubicaci[oó]','Ubicacio']);
    if(!road)road=fieldAny(block,['Lloc\\s+detall','Lloc','Zona','Sector']);
    road=one(road).replace(/^LOCALITZACI[ÓO]\s*/i,'').replace(/^Via\s*1\s*:?\s*/i,'').trim();
    const num=numberFrom(block);
    if(road&&num&&!hasNum(road))road=road+', '+num;
    return road;
  }

  function plScore(text,file){const h=N((file||'')+'\n'+String(text||'').slice(0,12000)),x=N((file||'')+'\n'+(text||'')),c=C((file||'')+'\n'+(text||''));return [/\bdesti\s*:?\s*policia\s+local\b/.test(x),/secretariapolicia@platjadaro\.com/.test(x)||c.includes('secretariapolicia@platjadaro.com'),/\bn[uú]m\.?\s+servei\b/.test(h),/\bnum\.?\s+servei\b/.test(h),/\blocalitzaci[oó]\b/.test(h)&&/\bvia\s*1\b/.test(h)].filter(Boolean).length}
  function meScore(text,file){const h=N((file||'')+'\n'+String(text||'').slice(0,16000)),x=N((file||'')+'\n'+(text||'')),c=C((file||'')+'\n'+(text||''));return [/\bmossos\s+d[' ]?esquadra\b/.test(h)||c.includes('mossosdesquadra'),/\bpolicia\s+de\s+la\s+generalitat\b/.test(h)||c.includes('policiadelageneralitat'),/\bpg\s*-?\s*me\b/.test(h)||c.includes('pgme'),/\busc\s+sant\s+feliu\s+de\s+guixols\b/.test(h)||c.includes('uscsantfeliudeguixols'),/\bcodi\s*:?\s*\d{5,}\b/.test(x),/\btitular\s*:/.test(x),/\bresponsable\s*:/.test(x)].filter(Boolean).length}
  function detectLocked(text,file){const pl=plScore(text,file),me=meScore(text,file);if(me>=3&&pl===0)return'MOSSOS';if(pl>0)return'PL';if(me>=2)return'MOSSOS';return'ALTRES'}

  function plBlocks(text){
    const s=String(text||'').replace(/\r/g,'\n').trim();
    const parts=s.split(/(?=\n?\s*(?:Dia i hora\s*:|Núm\.\s*Servei\s*:|Num\.\s*Servei\s*:|Servei\s*:|Incident\s*:))/i).map(x=>x.trim()).filter(x=>x.length>80);
    return parts.length?parts:s.split(/\n\s*\n/g).map(x=>x.trim()).filter(x=>x.length>80);
  }
  function meBlocks(text){
    const s=String(text||'').replace(/\r/g,'\n');let idx=[],m,re=/Codi\s*:?\s*\d{5,}/gi;while((m=re.exec(s))!==null)idx.push(m.index);
    if(idx.length>1)return idx.map((p,i)=>s.slice(p,i+1<idx.length?idx[i+1]:s.length).trim()).filter(p=>p.length>80);
    return s.split(/(?=\n?\s*(?:[^\n]{0,160}\s+)?Codi\s*:?\s*\d{5,})/i).map(p=>p.trim()).filter(p=>p.length>80);
  }
  function blocksLocked(text,type){return type==='MOSSOS'?meBlocks(text):plBlocks(text)}

  function parsePL(block,index,type){
    const id=G(block,[/Núm\.\s*Servei\s*:?\s*(\d+)/i,/Num\.\s*Servei\s*:?\s*(\d+)/i,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i,/Incident\s*:?\s*([A-Z0-9\-\/]+)/i])||fieldAny(block,['N[uú]m\\.?\\s*Servei','Num\\.?\\s*Servei','Servei','Incident'])||`AUTO-${String(index+1).padStart(3,'0')}`;
    const dt=fieldAny(block,['Dia i hora','Data(?:\\s+i\\s+hora)?'])||G(block,[/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i]);
    const title=G(block,[/NOTÍCIA\s*([\s\S]*?)\n\s*Requeriment:/i,/NOTICIA\s*([\s\S]*?)\n\s*Requeriment:/i,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i,/Fet(?:\s+principal)?\s*:?\s*([^\n]+)/i,/Assumpte\s*:?\s*([^\n]+)/i])||fieldAny(block,['Tipus(?:\\s+d\\'incident)?','Fet(?:\\s+principal)?','Assumpte','Not[ií]cia','Noticia'])||'Servei policial importat';
    const addr=addressFrom(block);
    const detail=fieldAny(block,['Lloc\\s+detall','Zona','Sector']);
    const desc=G(block,[/Descripció\s*:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADÍSTICA|\n\s*Resultat:|$)/i,/Descripcio\s*:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADISTICA|\n\s*Resultat:|$)/i,/Relat\s*:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i,/Observacions\s*:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i])||one(block).slice(0,520);
    if(!(addr||detail||/robatori|furt|baralla|accident|control|vigil|inund|menor|vehicle|alarma|assistencial|transit|trànsit/i.test(title+' '+desc)))return null;
    const cat=category(title,desc),pr=priority(title,desc,cat);
    return build({serviceId:id,dateTime:dt,title,address:addr,detail,desc,cat,pr,sourceType:type,index,prefix:type==='PL'?'pl':'ot'});
  }
  function parseME(block,index){
    const id=G(block,[/Codi\s*:?\s*(\d{5,})/i])||`MOSSOS-${index+1}`;
    const first=(String(block).split('\n').map(L).find(v=>v&&!/^(Codi|Titular|Responsable|Inici|Final|Loc|Adreça|Resultats|Cronologia)/i.test(v))||'').replace(/Codi\s*:?\s*\d+.*/i,'');
    const titular=G(block,[/Titular\s*:\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i]);
    const title=one([first,titular].filter(Boolean).join(' · '))||'Servei Mossos importat';
    const dt=G(block,[/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i]);
    const addr=addressFrom(block);
    const loc=fieldAny(block,['Loc','Municipi','Localitat']);
    const desc=G(block,[/(?:Notícia|Noticia|Descripció|Descripcio)\s*:\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i,/Resultats\s*:\s*([\s\S]*?)(?:\n\s*Cronologia dels fets\s*:|$)/i,/Cronologia dels fets\s*:\s*([\s\S]*)$/i])||one(block).slice(0,700);
    const cat=category(title,desc),pr=priority(title,desc,cat);
    return build({serviceId:id,dateTime:dt,title,address:addr,detail:loc,desc,cat,pr,sourceType:'MOSSOS',index,prefix:'me'});
  }
  function parseLocked(text,file){
    const type=detectLocked(text,file),parts=blocksLocked(text,type),parser=type==='MOSSOS'?parseME:(b,i)=>parsePL(b,i,type);
    const services=parts.map(parser).filter(Boolean).map(x=>({...x,sourceType:type,sourceLabel:sName(type),sourceBadge:type==='PL'?'PL':type==='MOSSOS'?'ME':'--'}));
    const ds={key:`${file}-${Date.now()}-${services.length}-${type}`,addedAt:new Date().toISOString(),source:{document:file,origin:sName(type),sourceType:type,reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD,plScore:plScore(text,file),mossosScore:meScore(text,file)},services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,120)};
    ds.summary=summary(services,1);ds.sourceStats=stats(services);return ds;
  }

  try{Object.defineProperty(window,'detect',{value:detectLocked,writable:false,configurable:false});}catch(e){window.detect=detectLocked}
  try{Object.defineProperty(window,'blocks',{value:blocksLocked,writable:false,configurable:false});}catch(e){window.blocks=blocksLocked}
  try{Object.defineProperty(window,'parse',{value:parseLocked,writable:false,configurable:false});}catch(e){window.parse=parseLocked}
  try{Object.defineProperty(window,'SIPDA_PDF_READER_LOCK',{value:{locked:true,build:BUILD,detect:detectLocked,parse:parseLocked,plScore,meScore,addressFrom},writable:false,configurable:false});}catch(e){window.SIPDA_PDF_READER_LOCK={locked:true,build:BUILD,parse:parseLocked,addressFrom}}
})();