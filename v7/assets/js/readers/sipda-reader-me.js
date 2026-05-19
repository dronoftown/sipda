/* SIPDA v7 · Dedicated reader: Mossos d'Esquadra */
(function(){
  const BUILD='reader-me-2026-05-20';
  function r(v){return String(v||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').trim();}
  function one(v){return r(v).replace(/\n+/g,' ').replace(/\s+/g,' ').trim();}
  function norm(v){return one(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function g(t,re){const m=String(t||'').match(re);return m&&m[1]?one(m[1]):'';}
  function detect(text,file){const s=norm((file||'')+' '+text);return /mossos|pg\s*-?\s*me|usc sant feliu|codi\s*:?\s*\d{5,}|titular\s*:|responsable\s*:/.test(s);}
  function blocks(text){
    const s=String(text||'').replace(/\r/g,'\n');
    const re=/(?:^|\n)([^\n]{0,180}?\bCodi\s*:?\s*\d{5,}[\s\S]*?)(?=\n[^\n]{0,180}?\bCodi\s*:?\s*\d{5,}|$)/gi;
    const out=[];let m;while((m=re.exec(s)))out.push(m[1].trim());
    return out.length?out:s.split(/(?=\n?[^\n]{0,180}?\bCodi\s*:?\s*\d{5,})/i).map(x=>x.trim()).filter(x=>x.length>80);
  }
  function cleanAddress(v){
    return one(v).replace(/\b0{3,}(\d{1,4})(?:\.0)?\b/g,'$1').replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró").replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró").replace(/\s+/g,' ').trim();
  }
  function loc(block){const m=one(block).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:/i);return m?cleanAddress(m[1]):cleanAddress(g(block,/Loc\s*:?\s*([^\n]+)/i));}
  function address(block){
    const flat=one(block);
    const m=flat.match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:?\s*(.*?)(?=\s+Districte\s*:|\s+Barri\s*:|\s+Not[ií]cia\s*:|\s+Noticia\s*:|\s+Descripci[oó]\s*:|\s+Resultats\s*:|\s+Cronologia\s*:|$)/i);
    if(m&&m[2])return cleanAddress(m[2]);
    return cleanAddress(g(block,/Adre[cç]a\s*:?\s*([^\n]+)/i));
  }
  function parse(text,file){
    const services=blocks(text).map(function(block,index){
      const id=g(block,/Codi\s*:?\s*(\d{5,})/i)||('ME-'+index);
      const type=g(block,/^\s*([^\n]{3,140}?)\s+Codi\s*:?\s*\d{5,}/i);
      const titular=g(block,/Titular\s*:?\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i);
      const title=one([type,titular].filter(Boolean).join(' · '))||'Servei Mossos importat';
      const dt=g(block,/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i)||g(block,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i);
      const ad=address(block);
      const lc=loc(block);
      const desc=g(block,/(?:Not[ií]cia|Noticia|Descripci[oó]|Descripcio)\s*:?\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i)||g(block,/Resultats\s*:?\s*([\s\S]*?)(?:\n\s*Cronologia dels fets\s*:|$)/i)||one(block).slice(0,650);
      const cat=typeof category==='function'?category(title,desc):'Altres';
      const pr=typeof priority==='function'?priority(title,desc,cat):'low';
      return build({serviceId:id,dateTime:dt,title:title,address:ad,detail:lc,desc:desc,cat:cat,pr:pr,sourceType:'MOSSOS',index:index,prefix:'me'});
    }).filter(Boolean);
    const ds={key:(file||'mossos')+'-'+Date.now()+'-'+services.length+'-ME',addedAt:new Date().toISOString(),source:{document:file,origin:typeof sName==='function'?sName('MOSSOS'):'Mossos',sourceType:'MOSSOS',reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services:services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,120)};
    ds.summary=typeof summary==='function'?summary(services,1):{total:services.length};
    ds.sourceStats=typeof stats==='function'?stats(services):{PL:0,MOSSOS:services.length,ALTRES:0};
    return ds;
  }
  window.SIPDA_READER_ME={build:BUILD,detect:detect,parse:parse,address:address,loc:loc};
})();
