/* SIPDA v7 · forced stable PDF upload controller PL/ME */
(function(){
  const BUILD='forced-pdf-controller-2026-05-20';
  const CENTER=[41.8162,3.0608];
  function R(v){return String(v||'').replace(/\r/g,'\n')}
  function O(v){return R(v).replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim()}
  function N(v){return O(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function G(t,re){const m=String(t||'').match(re);return m&&m[1]?O(m[1]):''}
  function T(v){try{return typeof time==='function'?time(v):'--:--'}catch(e){return'--:--'}}
  function SN(t){return t==='MOSSOS'?"Mossos d'Esquadra":t==='PL'?'Policia Local':'Altres'}
  function SB(t){return t==='MOSSOS'?'ME':t==='PL'?'PL':'--'}
  function CAT(t,d){try{return typeof category==='function'?category(t,d):'Altres'}catch(e){return'Altres'}}
  function PRI(t,d,c){try{return typeof priority==='function'?priority(t,d,c):'low'}catch(e){return'low'}}
  function SC(p){return p==='high'?9:p==='medium'?6:3}
  function CRS(z,i,t){try{return typeof coords==='function'?coords(z,i,t):CENTER}catch(e){return CENTER}}
  function ADR(v){
    v=O(v).replace(/^\s*(?:LOCALITZACI[ÓO]|Via\s*1|Adre[cç]a|Ubicaci[oó]|Lloc|Loc)\s*:?\s*/i,'');
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
      .replace(/\b0{3,}(\d{1,4})(?:\.0)?\b/g,'$1')
      .replace(/\s+,\s*/g,', ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function service(o){
    const z=ADR(o.address||o.detail||'Ubicació pendent de validar');
    return {id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:T(o.dateTime),title:O(o.title).slice(0,160),category:o.cat,priority:o.pr,score:SC(o.pr),zone:z,address:z,displayAddress:z,summary:O(o.desc).slice(0,560),sourceType:o.sourceType,sourceLabel:SN(o.sourceType),sourceBadge:SB(o.sourceType),coordinates:CRS(z,o.index,o.sourceType)};
  }
  function dataset(file,type,services){
    const ds={key:(file||type)+'-'+Date.now()+'-'+services.length+'-'+type,addedAt:new Date().toISOString(),source:{document:file,origin:SN(type),sourceType:type,reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,160)};
    try{ds.summary=typeof summary==='function'?summary(services,1):null;ds.sourceStats=typeof stats==='function'?stats(services):null}catch(e){}
    if(!ds.summary)ds.summary={total:services.length,high:services.filter(x=>x.priority==='high').length,medium:services.filter(x=>x.priority==='medium').length,low:services.filter(x=>x.priority==='low').length,risk:'low',executive:'Lectura PDF importada.',recommendation:'Revisar serveis detectats.'};
    if(!ds.sourceStats)ds.sourceStats={PL:type==='PL'?services.length:0,MOSSOS:type==='MOSSOS'?services.length:0,ALTRES:0};
    return ds;
  }
  function isPL(text,file){const x=N((file||'')+' '+text);return /policia local|secretariapolicia@platjadaro\.com|n[uú]m\.?\s*servei|num\.?\s*servei|dia i hora|localitzacio|localització|via\s*1|requeriment/.test(x)&&!/mossos d|pg\s*-?\s*me|policia de la generalitat/.test(x)}
  function isME(text,file){const x=N((file||'')+' '+text);return /mossos|pg\s*-?\s*me|policia de la generalitat|usc sant feliu|codi\s*:?\s*\d{5,}|titular\s*:|responsable\s*:/.test(x)}
  function plBlocks(text){
    const s=R(text).trim();
    let a=s.split(/(?=\n?\s*(?:Dia i hora\s*:|N[uú]m\.?\s*Servei\s*:|Num\.?\s*Servei\s*:|Servei\s*:|Incident\s*:))/i).map(x=>x.trim()).filter(x=>x.length>80);
    if(a.length>1)return a;
    a=s.split(/(?=\n?\s*LOCALITZACI[ÓO])/i).map(x=>x.trim()).filter(x=>x.length>80);
    return a.length?a:[s];
  }
  function plAddress(block){
    const f=O(block);
    let m=f.match(/(?:LOCALITZACI[ÓO]\s+)?Via\s*1\s*:?\s*(.*?)(?=\s+(?:Via\s*2|Descripci[oó]|Descripcio|Not[ií]cia|Noticia|Requeriment|Hora inici|ESTAD|Resultat|Unitat|Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei)\b|$)/i);
    if(m&&m[1])return ADR(m[1]);
    m=f.match(/\b((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{2,120}\s+\d{1,4})\b/i);
    return m&&m[1]?ADR(m[1]):'';
  }
  function parsePL(text,file){
    const sv=plBlocks(text).map((b,i)=>{
      const id=G(b,/N[uú]m\.?\s*Servei\s*:?\s*(\d+)/i)||G(b,/Num\.?\s*Servei\s*:?\s*(\d+)/i)||G(b,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i)||('PL-'+i);
      const dt=G(b,/Dia i hora\s*:?\s*([^\n]+)/i)||G(b,/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i);
      const title=G(b,/NOTÍCIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(b,/NOTICIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(b,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i)||'Servei Policia Local importat';
      const ad=plAddress(b);
      const detail=G(b,/Lloc\s+detall\s*:?\s*([^\n]+)/i)||G(b,/Zona\s*:?\s*([^\n]+)/i)||G(b,/Sector\s*:?\s*([^\n]+)/i);
      const desc=G(b,/Descripci[oó]\s*:?\s*([\s\S]*?)(?:\n\s*Hora inici|\n\s*ESTAD|\n\s*Resultat|\n\s*Unitat|$)/i)||O(b).slice(0,700);
      if(!ad&&!detail&&!/robatori|furt|accident|control|vigil|vehicle|alarma|assistencial|tr[aà]nsit|requeriment|localitzacio/i.test(title+' '+desc+' '+b))return null;
      const c=CAT(title,desc),p=PRI(title,desc,c);
      return service({serviceId:id,dateTime:dt,title,address:ad,detail,desc,cat:c,pr:p,sourceType:'PL',index:i,prefix:'pl'});
    }).filter(Boolean);
    return dataset(file,'PL',sv);
  }
  function meBlocks(text){
    const s=R(text);const re=/(?:^|\n)([^\n]{0,180}?\bCodi\s*:?\s*\d{5,}[\s\S]*?)(?=\n[^\n]{0,180}?\bCodi\s*:?\s*\d{5,}|$)/gi;
    const out=[];let m;while((m=re.exec(s)))out.push(m[1].trim());
    return out.length?out:s.split(/(?=\n?[^\n]{0,180}?\bCodi\s*:?\s*\d{5,})/i).map(x=>x.trim()).filter(x=>x.length>80);
  }
  function meLoc(b){const m=O(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:/i);return m?ADR(m[1]):G(b,/Loc\s*:?\s*([^\n]+)/i)}
  function meAddress(b){const m=O(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:?\s*(.*?)(?=\s+Districte\s*:|\s+Barri\s*:|\s+Not[ií]cia\s*:|\s+Noticia\s*:|\s+Descripci[oó]\s*:|\s+Resultats\s*:|\s+Cronologia\s*:|$)/i);if(m&&m[2])return ADR(m[2]);return ADR(G(b,/Adre[cç]a\s*:?\s*([^\n]+)/i))}
  function parseME(text,file){
    const sv=meBlocks(text).map((b,i)=>{
      const id=G(b,/Codi\s*:?\s*(\d{5,})/i)||('ME-'+i);
      const typ=G(b,/^\s*([^\n]{3,140}?)\s+Codi\s*:?\s*\d{5,}/i);
      const tit=G(b,/Titular\s*:?\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i);
      const title=O([typ,tit].filter(Boolean).join(' · '))||'Servei Mossos importat';
      const dt=G(b,/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i)||G(b,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i);
      const ad=meAddress(b),detail=meLoc(b);
      const desc=G(b,/(?:Not[ií]cia|Noticia|Descripci[oó]|Descripcio)\s*:?\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i)||O(b).slice(0,650);
      const c=CAT(title,desc),p=PRI(title,desc,c);
      return service({serviceId:id,dateTime:dt,title,address:ad,detail,desc,cat:c,pr:p,sourceType:'MOSSOS',index:i,prefix:'me'});
    }).filter(Boolean);
    return dataset(file,'MOSSOS',sv);
  }
  function parseStable(text,file){const reader=isPL(text,file)?'PL':isME(text,file)?'MOSSOS':'AUTO';window.SIPDA_LAST_READER=reader;return reader==='PL'?parsePL(text,file):reader==='MOSSOS'?parseME(text,file):(typeof parse==='function'?parse(text,file):dataset(file,'ALTRES',[]))}
  async function forcedHandle(e){
    const input=e.target;if(!input||input.id!=='pdfInput')return;
    e.preventDefault();e.stopImmediatePropagation();
    const f=input.files&&input.files[0];if(!f)return;
    try{
      if(typeof status==='function')status('importStatus','Informe rebut: '+f.name);
      const bar=document.getElementById('importProgress');if(bar)bar.style.width='8%';
      const text=await pdfText(f);window.SIPDA_LAST_PDF_TEXT=text;
      PENDING=parseStable(text,f.name);
      if(!PENDING.services.length){if(typeof status==='function')status('importStatus','PDF llegit amb lector '+window.SIPDA_LAST_READER+', però no s’han detectat serveis operatius.','warning');return;}
      const p=document.getElementById('importPreview');
      if(p)p.innerHTML='<div><span>Lector</span><strong>'+(PENDING.source.sourceType==='MOSSOS'?'ME':PENDING.source.sourceType)+'</strong></div><div><span>Serveis</span><strong>'+PENDING.services.length+'</strong></div><div><span>Alta</span><strong>'+(PENDING.summary.high||0)+'</strong></div><div><span>Mitjana</span><strong>'+(PENDING.summary.medium||0)+'</strong></div>';
      if(bar)bar.style.width='100%';
      if(typeof status==='function')status('importStatus','Anàlisi completada amb lector '+(PENDING.source.sourceType==='MOSSOS'?'ME':'PL')+': '+PENDING.services.length+' serveis.','success');
      ['applyPanel','addHistory'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=false});
    }catch(err){if(typeof status==='function')status('importStatus','Error important informe: '+(err.message||err),'error');}
    finally{input.value='';}
  }
  document.addEventListener('change',forcedHandle,true);
  window.handle=forcedHandle;
  window.SIPDA_FORCE_PDF_CONTROLLER={build:BUILD,active:true,parse:parseStable,isPL,isME};
})();
