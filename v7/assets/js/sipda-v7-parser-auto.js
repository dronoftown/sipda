/* SIPDA v7 parser auto · LOCKED PDF READER
   Lector controlado PL / ME con extractor de dirección policial.
*/
(function(){
  const BUILD='locked-pdf-reader-address-2026-05-20';
  function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@.\s:_\/-]/g,' ').replace(/\s+/g,' ').trim()}
  function C(v){return N(v).replace(/\s+/g,'')}
  function L(v){return String(v||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim()}
  function G(b,rs){for(const r of rs){const m=String(b||'').match(r);if(m&&m[1])return L(m[1])}return''}
  function labelLike(v){return /^(Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei|Servei|Incident|Requeriment|Nivell|Prioritat|Via\s*1|Via\s*2|Adre[cç]a|Lloc|Lloc detall|Ubicaci[oó]|Zona|Sector|Municipi|Localitat|Titular|Responsable|Inici|Final|Loc|Resultats|Cronologia|Not[ií]cia|Descripci[oó]|Hora inici|Unitat|Estad[ií]stica|Codi)\b/i.test(String(v||'').trim())}
  function smartField(block,labels){
    const lines=String(block||'').replace(/\r/g,'\n').split('\n').map(x=>x.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
    for(let i=0;i<lines.length;i++){
      for(const label of labels){
        const re=new RegExp('^'+label+'\\s*:?\\s*(.*)$','i');
        const m=lines[i].match(re);
        if(!m)continue;
        const same=L(m[1]||'');
        if(same&&!labelLike(same))return same;
        const parts=[];
        for(let j=i+1;j<Math.min(lines.length,i+5);j++){
          if(labelLike(lines[j]))break;
          parts.push(lines[j]);
          if(parts.join(' ').length>90)break;
        }
        if(parts.length)return L(parts.join(' '));
      }
    }
    return'';
  }
  function hasNumber(v){return /(^|[\s,])\d{1,4}([A-Za-zÀ-ÿ]?|\s*[-/]\s*\d{1,4})?($|[\s,])/i.test(' '+String(v||'')+' ')}
  function cleanAddress(v){return L(v).replace(/^\s*(?:via\s*1|via|adre[cç]a|ubicaci[oó]|lloc|lloc\s+detall)\s*:?\s*/i,'').trim()}
  function roadNumber(block){
    return smartField(block,['N[uú]m\\.?\\s*Via','Num\\.?\\s*Via','N[uú]mero\\s*Via','Numero\\s*Via','N[uú]mero','Numero','N[uú]m\\.?','Num\\.?','Portal']);
  }
  function addressFromBlock(block,primaryLabels,secondaryLabels){
    let road=smartField(block,primaryLabels||['Via\\s*1','Adre[cç]a','Adreca','Ubicaci[oó]','Ubicacio','Lloc']);
    if(!road&&secondaryLabels)road=smartField(block,secondaryLabels);
    road=cleanAddress(road);
    const number=roadNumber(block);
    if(road&&number&&!hasNumber(road))road=road+', '+number;
    return road;
  }
  function plScore(t,f){const h=N((f||'')+'\n'+String(t||'').slice(0,12000)),x=N((f||'')+'\n'+(t||'')),c=C((f||'')+'\n'+(t||''));return [/\bdesti\s*:?\s*policia\s+local\b/.test(x),/secretariapolicia@platjadaro\.com/.test(x)||c.includes('secretariapolicia@platjadaro.com'),/\bn[uú]m\.?\s+servei\b/.test(h),/\bnum\.?\s+servei\b/.test(h),/\bnivell\s+prioritat\b/.test(h)&&/\brequeriment\b/.test(h),/\bvia\s+1\b/.test(h)&&/\blloc\s+detall\b/.test(h)].filter(Boolean).length}
  function meScore(t,f){const h=N((f||'')+'\n'+String(t||'').slice(0,16000)),x=N((f||'')+'\n'+(t||'')),c=C((f||'')+'\n'+(t||''));return [/\bmossos\s+d[' ]?esquadra\b/.test(h)||c.includes('mossosdesquadra'),/\bpolicia\s+de\s+la\s+generalitat\b/.test(h)||c.includes('policiadelageneralitat'),/\bpg\s*-?\s*me\b/.test(h)||c.includes('pgme'),/\busc\s+sant\s+feliu\s+de\s+guixols\b/.test(h)||c.includes('uscsantfeliudeguixols'),/\bcodi\s*:?\s*\d{5,}\b/.test(x),/\btitular\s*:/.test(x),/\bresponsable\s*:/.test(x),/\bresultats\s*:/.test(x),/\bcronologia\s+dels\s+fets\s*:/.test(x),/\bdata\s+acceptaci[oó]\b/.test(x)].filter(Boolean).length}
  const detectLocked=function(t,f){const pl=plScore(t,f),me=meScore(t,f);if(me>=3&&pl===0)return'MOSSOS';if(pl>0)return'PL';if(me>=2)return'MOSSOS';return'ALTRES'};
  function plBlocks(t){const s=String(t||'').replace(/\r/g,'\n').trim();const a=s.split(/(?=\n?\s*(?:Dia i hora:|Núm\.\s*Servei:|Num\.\s*Servei:|Servei:|Incident:))/i).map(p=>p.trim()).filter(p=>p.length>80);return a.length?a:s.split(/\n\s*\n/g).map(p=>p.trim()).filter(p=>p.length>80)}
  function meBlocks(t){const s=String(t||'').replace(/\r/g,'\n');let idx=[],m,re=/Codi\s*:?\s*\d{5,}/gi;while((m=re.exec(s))!==null)idx.push(m.index);if(idx.length>1)return idx.map((p,i)=>s.slice(p,i+1<idx.length?idx[i+1]:s.length).trim()).filter(p=>p.length>80);const a=s.split(/(?=\n?\s*(?:[^\n]{0,160}\s+)?Codi\s*:?\s*\d{5,})/i).map(p=>p.trim()).filter(p=>p.length>80);return a.length?a:s.split(/\n\s*\n/g).map(p=>p.trim()).filter(p=>p.length>120&&/(Codi\s*:|Titular\s*:|Responsable\s*:)/i.test(p))}
  const blocksLocked=function(t,type){return type==='MOSSOS'?meBlocks(t):plBlocks(t)};
  function meBlock(b,i){const id=G(b,[/Codi\s*:?\s*(\d{5,})/i])||`MOSSOS-${i+1}`;const first=(String(b).split('\n').map(L).find(v=>v&&!/^(Codi|Titular|Responsable|Inici|Final|Loc|Adreça|Resultats|Cronologia)/i.test(v))||'').replace(/Codi\s*:?\s*\d+.*/i,'');const tit=G(b,[/Titular\s*:\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i]);const title=L([first,tit].filter(Boolean).join(' · '))||'Servei Mossos importat';const dt=G(b,[/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i]);const loc=smartField(b,['Loc','Municipi','Localitat']);const adr=addressFromBlock(b,['Adre[cç]a','Adreca','Ubicaci[oó]','Ubicacio','Lloc'],['Loc']);const desc=G(b,[/(?:Notícia|Noticia|Descripció|Descripcio)\s*:\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i,/Resultats\s*:\s*([\s\S]*?)(?:\n\s*Cronologia dels fets\s*:|$)/i,/Cronologia dels fets\s*:\s*([\s\S]*)$/i])||L(b).slice(0,700);const cat=category(title,desc),pr=priority(title,desc,cat);return build({serviceId:id,dateTime:dt,title,address:adr,detail:loc,desc,cat,pr,sourceType:'MOSSOS',index:i,prefix:'me'})}
  function plBlock(b,i,type){const id=G(b,[/Núm\.\s*Servei\s*:?\s*(\d+)/i,/Num\.\s*Servei\s*:?\s*(\d+)/i,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i,/Incident\s*:?\s*([A-Z0-9\-\/]+)/i])||smartField(b,['N[uú]m\\.?\\s*Servei','Num\\.?\\s*Servei','Servei','Incident'])||`AUTO-${String(i+1).padStart(3,'0')}`;const dt=smartField(b,['Dia i hora','Data(?:\\s+i\\s+hora)?'])||G(b,[/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i]);const title=G(b,[/NOTÍCIA\s*([\s\S]*?)\n\s*Requeriment:/i,/NOTICIA\s*([\s\S]*?)\n\s*Requeriment:/i,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i,/Fet(?:\s+principal)?\s*:?\s*([^\n]+)/i,/Assumpte\s*:?\s*([^\n]+)/i])||smartField(b,['Tipus(?:\\s+d\\'incident)?','Fet(?:\\s+principal)?','Assumpte','Not[ií]cia','Noticia'])||'Servei policial importat';const addr=addressFromBlock(b,['Via\\s*1','Adre[cç]a','Adreca','Ubicaci[oó]','Ubicacio','Lloc'],['Lloc\\s+detall','Zona','Sector']);const det=smartField(b,['Lloc\\s+detall','Detall(?:\\s+lloc)?','Zona','Sector']);const desc=G(b,[/Descripció\s*:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADÍSTICA|\n\s*Resultat:|$)/i,/Descripcio\s*:\s*([\s\S]*?)(?:\n\s*Hora inici:|\n\s*ESTADISTICA|\n\s*Resultat:|$)/i,/Relat\s*:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i,/Observacions\s*:\s*([\s\S]*?)(?:\n\s*Resultat:|\n\s*Unitat|$)/i])||L(b).slice(0,520);if(!(addr||det||/robatori|furt|baralla|accident|control|vigil|inund|menor|vehicle|alarma|assistencial|transit|trànsit/i.test(title+' '+desc)))return null;const cat=category(title,desc),pr=priority(title,desc,cat);return build({serviceId:id,dateTime:dt,title,address:addr,detail:det,desc,cat,pr,sourceType:type,index:i,prefix:type==='PL'?'pl':'ot'})}
  const parseLocked=function(t,f){const type=detectLocked(t,f),parts=blocksLocked(t,type),parser=type==='MOSSOS'?meBlock:(b,i)=>plBlock(b,i,type);const services=parts.map(parser).filter(Boolean).map(x=>({...x,sourceType:type,sourceLabel:sName(type),sourceBadge:type==='PL'?'PL':type==='MOSSOS'?'ME':'--'}));const ds={key:`${f}-${Date.now()}-${services.length}-${type}`,addedAt:new Date().toISOString(),source:{document:f,origin:sName(type),sourceType:type,reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD,plScore:plScore(t,f),mossosScore:meScore(t,f)},services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,120)};ds.summary=summary(services,1);ds.sourceStats=stats(services);return ds};
  Object.defineProperty(window,'detect',{value:detectLocked,writable:false,configurable:false});
  Object.defineProperty(window,'blocks',{value:blocksLocked,writable:false,configurable:false});
  Object.defineProperty(window,'parse',{value:parseLocked,writable:false,configurable:false});
  Object.defineProperty(window,'SIPDA_PDF_READER_LOCK',{value:{locked:true,build:BUILD,detect:detectLocked,parse:parseLocked,plScore,meScore,addressFromBlock},writable:false,configurable:false});
})();