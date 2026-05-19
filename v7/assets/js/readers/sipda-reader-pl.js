/* SIPDA v7 · Dedicated reader: Policia Local */
(function(){
  const BUILD='reader-pl-strong-2026-05-20';

  function raw(v){return String(v||'').replace(/\r/g,'\n');}
  function one(v){return String(v||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim();}
  function norm(v){return one(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function get(block,re){const m=String(block||'').match(re);return m&&m[1]?one(m[1]):'';}
  function expandAddress(v){
    v=one(v).replace(/^\s*(?:Localitzaci[oó]|Via\s*1|Adre[cç]a|Ubicaci[oó]|Lloc)\s*:?\s*/i,'');
    v=v.replace(/^(AV|AV\.|AVDA|AVGDA|AVINGUDA)\s+/i,'Avinguda ')
       .replace(/^(C|C\.|CL|CR|CARRER)\s+/i,'Carrer ')
       .replace(/^(PL|PÇA|PLAÇA)\s+/i,'Plaça ')
       .replace(/^(PG|PS|PASSEIG)\s+/i,'Passeig ')
       .replace(/^(CTRA|CARRETERA)\s+/i,'Carretera ')
       .replace(/^(RBLA|RAMBLA)\s+/i,'Rambla ')
       .replace(/^(PTGE|PASSATGE)\s+/i,'Passatge ')
       .replace(/^(TRAV|TRAVESSERA)\s+/i,'Travessera ')
       .replace(/^(CAMI|CAMÍ)\s+/i,'Camí ')
       .replace(/^(URB|URBANITZACIÓ|URBANITZACIO)\s+/i,'Urbanització ');
    return v.replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró")
      .replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró")
      .replace(/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro")
      .replace(/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro")
      .replace(/\s+/g,' ')
      .trim();
  }
  function detect(text,file){
    const n=norm((file||'')+' '+text);
    const mossos=/mossos d|pg\s*-?\s*me|policia de la generalitat/.test(n);
    const pl=/policia local|num\.? servei|n[uú]m\.? servei|secretariapolicia@platjadaro\.com|localitzacio|localització|via\s*1|requeriment|dia i hora/.test(n);
    return pl&&!mossos;
  }
  function blocks(text){
    const s=raw(text).trim();
    let parts=s.split(/(?=\n?\s*(?:Dia i hora\s*:|Núm\.\s*Servei\s*:|Num\.\s*Servei\s*:|Servei\s*:|Incident\s*:))/i).map(x=>x.trim()).filter(x=>x.length>80);
    if(parts.length>1)return parts;
    parts=s.split(/(?=\n?\s*LOCALITZACI[ÓO])/i).map(x=>x.trim()).filter(x=>x.length>80);
    if(parts.length>1)return parts;
    parts=s.split(/\n\s*\n/g).map(x=>x.trim()).filter(x=>x.length>80);
    return parts.length?parts:[s];
  }
  function address(block){
    const flat=one(block);
    let m=flat.match(/(?:Localitzaci[oó]\s+)?Via\s*1\s*:?\s*(.*?)(?=\s+(?:Via\s*2|Descripci[oó]|Descripcio|Not[ií]cia|Noticia|Requeriment|Hora inici|ESTAD|Resultat|Unitat|Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei)\b|$)/i);
    if(m&&m[1])return expandAddress(m[1]);
    m=flat.match(/(?:Adre[cç]a|Ubicaci[oó]|Lloc)\s*:?\s*(.*?)(?=\s+(?:Descripci[oó]|Descripcio|Not[ií]cia|Noticia|Requeriment|Hora inici|ESTAD|Resultat|Unitat|Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei)\b|$)/i);
    if(m&&m[1])return expandAddress(m[1]);
    m=flat.match(/\b((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{2,120}\s+\d{1,4})\b/i);
    if(m&&m[1])return expandAddress(m[1]);
    return '';
  }
  function titleOf(block){
    return get(block,/NOTÍCIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)
      ||get(block,/NOTICIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)
      ||get(block,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i)
      ||get(block,/Fet(?:\s+principal)?\s*:?\s*([^\n]+)/i)
      ||get(block,/Assumpte\s*:?\s*([^\n]+)/i)
      ||'Servei Policia Local importat';
  }
  function description(block){
    return get(block,/Descripci[oó]\s*:?\s*([\s\S]*?)(?:\n\s*Hora inici|\n\s*ESTAD|\n\s*Resultat|\n\s*Unitat|$)/i)
      ||get(block,/Relat\s*:?\s*([\s\S]*?)(?:\n\s*Resultat|\n\s*Unitat|$)/i)
      ||get(block,/Observacions\s*:?\s*([\s\S]*?)(?:\n\s*Resultat|\n\s*Unitat|$)/i)
      ||one(block).slice(0,700);
  }
  function parse(text,file){
    const services=blocks(text).map(function(block,index){
      const id=get(block,/N[uú]m\.\s*Servei\s*:?\s*(\d+)/i)||get(block,/Num\.\s*Servei\s*:?\s*(\d+)/i)||get(block,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i)||('PL-'+index);
      const dt=get(block,/Dia i hora\s*:?\s*([^\n]+)/i)||get(block,/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i);
      const title=titleOf(block);
      const addr=address(block);
      const detail=get(block,/Lloc\s+detall\s*:?\s*([^\n]+)/i)||get(block,/Zona\s*:?\s*([^\n]+)/i)||get(block,/Sector\s*:?\s*([^\n]+)/i);
      const desc=description(block);
      if(!addr&&!detail&&!/robatori|furt|accident|control|vigil|vehicle|alarma|assistencial|tr[aà]nsit|requeriment|localitzacio/i.test(title+' '+desc+' '+block))return null;
      const cat=typeof category==='function'?category(title,desc):'Altres';
      const pr=typeof priority==='function'?priority(title,desc,cat):'low';
      return build({serviceId:id,dateTime:dt,title,address:addr,detail:detail,desc:desc,cat:cat,pr:pr,sourceType:'PL',index:index,prefix:'pl'});
    }).filter(Boolean);
    const ds={key:(file||'pl')+'-'+Date.now()+'-'+services.length+'-PL',addedAt:new Date().toISOString(),source:{document:file,origin:typeof sName==='function'?sName('PL'):'Policia Local',sourceType:'PL',reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services:services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,120)};
    ds.summary=typeof summary==='function'?summary(services,1):{total:services.length,high:0,medium:0,low:0};
    ds.sourceStats=typeof stats==='function'?stats(services):{PL:services.length,MOSSOS:0,ALTRES:0};
    return ds;
  }
  window.SIPDA_READER_PL={build:BUILD,detect:detect,parse:parse,address:address,blocks:blocks};
})();
