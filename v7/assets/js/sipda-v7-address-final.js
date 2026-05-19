/* SIPDA v7 · address final compact guard */
(function(){
  const BUILD='address-final-via1-inline-2026-05-20';
  const BAD=/adre[cç]a\s+no\s+detectada|ubicaci[oó]\s+pendent|no\s+determinat|sense\s+zona/i;
  const STREET=/^(Avinguda|Carrer|Plaça|Passeig|Carretera|Rambla|Passatge|Travessera|Camí|Urbanització)\b/i;
  const ROAD=/^(AV|AV\.|AVDA|AVGDA|AVINGUDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|CARRETERA|RBLA|PTGE|TRAV|CAMI|CAMÍ|URB)$/i;
  const LABEL=/^(via\s*1:?|adre[cç]a:?|adreca:?|ubicaci[oó]:?|ubicacio:?|lloc:?|lloc\s+detall:?|loc:?)$/i;
  const STOP=/^(dia i hora|servei|incident|requeriment|nivell|prioritat|via\s*2|titular|responsable|inici|final|resultats|cronologia|not[ií]cia|noticia|descripci[oó]|descripcio|hora inici|unitat|estad[ií]stica|codi)$/i;
  const NUM=/^(n[uú]m\.?\s*via|num\.?\s*via|n[uú]mero\s*via|numero\s*via|portal|n[uú]mero|numero)$/i;
  const SKIP=/^(localitzaci[oó]|tipus\s+via|tipo\s+via|nom\s+via|nombre\s+via)$/i;
  function raw(v){return String(v||'').replace(/\r/g,' ').replace(/\n+/g,' ').replace(/\s+/g,' ').trim();}
  function clean(v){return raw(v).replace(/^\s*(?:via\s*1:?|via|adre[cç]a:?|adreca:?|ubicaci[oó]:?|ubicacio:?|lloc:?|lloc\s+detall:?|loc:?|zona:?|sector:?)\s*/i,'').trim();}
  function norm(v){return raw(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
  function street(v){
    v=clean(v); if(!v)return '';
    const rules=[[/^(AV|AV\.|AVDA|AVGDA|AVINGUDA)\s+/i,'Avinguda '],[/^(C|C\.|CL|CR|CARRER)\s+/i,'Carrer '],[/^(PL|PÇA|PLAÇA)\s+/i,'Plaça '],[/^(PG|PS|PASSEIG)\s+/i,'Passeig '],[/^(CTRA|CARRETERA)\s+/i,'Carretera '],[/^(RBLA|RAMBLA)\s+/i,'Rambla '],[/^(PTGE|PASSATGE)\s+/i,'Passatge '],[/^(TRAV|TRAVESSERA)\s+/i,'Travessera '],[/^(CAMI|CAMÍ)\s+/i,'Camí '],[/^(URB|URBANITZACIÓ|URBANITZACIO)\s+/i,'Urbanització ']];
    rules.some(r=>{if(r[0].test(v)){v=v.replace(r[0],r[1]);return true;}return false;});
    return v.replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró").replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró").replace(/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro").replace(/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro").replace(/\bGI\s*-\s*662\b/gi,'Carretera GI-662').replace(/\s+,\s*/g,', ').replace(/\s+/g,' ').trim();
  }
  function isViaOne(v){return /^1:?$/.test(norm(v));}
  function isLabel(a,b){const n=norm(a);return /^via\s*1:?/.test(n)||LABEL.test(n)||(n==='via'&&isViaOne(b));}
  function join(parts){
    const p=parts.map(clean).filter(Boolean).filter(x=>!SKIP.test(norm(x))); const out=[];
    for(let i=0;i<p.length;i++){if(NUM.test(norm(p[i]))){const n=p[i+1]||'';if(/^\d{1,4}[A-Za-zÀ-ÿ]?$/.test(n)){out.push(', '+n);i++;}continue;}out.push(p[i]);}
    return street(out.join(' '));
  }
  function rebuild(text){
    const lines=String(text||'').replace(/\r/g,'\n').split('\n').map(x=>x.trim()); const out=[];
    for(let i=0;i<lines.length;i++){
      if(!isLabel(lines[i],lines[i+1])){out.push(lines[i]);continue;}
      let parts=[]; const inline=clean(lines[i]); if(inline&&inline!==raw(lines[i]))parts.push(inline);
      let start=(norm(lines[i])==='via'&&isViaOne(lines[i+1]))?i+2:i+1, end=i;
      for(let j=start;j<Math.min(lines.length,start+14);j++){
        const cur=clean(lines[j]); if(!cur)continue; if(STOP.test(norm(cur)))break; if(isLabel(cur,lines[j+1])&&j>start)break; if(SKIP.test(norm(cur)))continue;
        parts.push(cur); end=j; const merged=join(parts); if((ROAD.test(parts[0]||'')||STREET.test(merged))&&/\d{1,4}/.test(merged))break;
      }
      const merged=join(parts); out.push('Via 1: '+(merged||clean(lines[i]))); i=end;
    }
    return out.join('\n');
  }
  function extract(text){
    const s=raw(text); if(!s)return '';
    const loc=s.match(/Loc\s*:?\s*([^\n]{0,90}?)\s+Adre[cç]a\s*:?\s*([^\n]{2,140})/i); if(loc&&loc[2])return street(loc[2]);
    const m=s.match(/(?:Via\s*1|Adre[cç]a|Ubicaci[oó]|Lloc|Loc)\s*:?\s*((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB|Avinguda|Carrer|Plaça|Passeig|Carretera|GI-662|S['’]Agaró|Mas|Pau|Tramuntana)[^.;|\n]{1,150})/i)||s.match(/\b((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB|GI-662)\s+[A-ZÀ-ÿ0-9'’.,\- ]{2,120})/i);
    return m&&m[1]?street(m[1]):'';
  }
  function best(o){const a=[o&&o.address,o&&o.displayAddress,o&&o.zone,o&&o.location,o&&o.detail,extract(o&&o.desc),extract(o&&o.summary)].map(street).filter(x=>x&&!BAD.test(x));return a.find(x=>STREET.test(x))||a[0]||'Ubicació pendent de validar';}
  const oldPdf=typeof pdfText==='function'?pdfText:window.pdfText;
  if(oldPdf){const wrapped=async function(file){const t=await oldPdf.apply(this,arguments);const r=rebuild(t);window.SIPDA_LAST_PDF_TEXT=r;window.SIPDA_LAST_PDF_TEXT_ORIGINAL=t;return r;};try{pdfText=wrapped;}catch(e){}window.pdfText=wrapped;}
  function coord(z,o){try{return typeof coords==='function'?coords(z,o&&o.index,o&&o.sourceType):[41.8162,3.0608];}catch(e){return[41.8162,3.0608];}}
  function finalBuild(o){o=o||{};const z=best(o);return{id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:typeof time==='function'?time(o.dateTime):'--:--',title:(typeof line==='function'?line(o.title):raw(o.title)).slice(0,160),category:o.cat,priority:o.pr,score:typeof score==='function'?score(o.pr):3,zone:z,displayAddress:z,address:z,summary:(typeof line==='function'?line(o.desc):raw(o.desc)).slice(0,520),sourceType:o.sourceType,sourceLabel:typeof sName==='function'?sName(o.sourceType):o.sourceType,sourceBadge:o.sourceType==='PL'?'PL':o.sourceType==='MOSSOS'?'ME':'--',coordinates:coord(z,o)};}
  try{build=finalBuild;}catch(e){}window.build=finalBuild;
  window.SIPDA_ADDRESS_FINAL={active:true,build:BUILD,rebuildPdfAddresses:rebuild,bestAddress:best,wrappedPdfText:!!oldPdf};
})();

/* SIPDA v7 · Mossos parser hotfix */
(function(){
  const BUILD='mossos-hotfix-2026-05-20';
  function r(v){return String(v||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').trim();}
  function one(v){return r(v).replace(/\n+/g,' ').replace(/\s+/g,' ').trim();}
  function g(t,re){const m=String(t||'').match(re);return m&&m[1]?one(m[1]):'';}
  function isMossos(text){const s=one(text).toLowerCase();return /mossos|pg\s*-?\s*me|usc sant feliu|codi\s*:?\s*\d{5,}|titular\s*:|responsable\s*:/.test(s);}
  function cleanAddress(v){v=one(v).replace(/\b0{3,}(\d{1,4})(?:\.0)?\b/g,'$1').replace(/\s+/g,' ').trim();return v;}
  function blocks(text){const s=String(text||'').replace(/\r/g,'\n');const re=/(?:^|\n)([^\n]{0,180}?\bCodi\s*:?\s*\d{5,}[\s\S]*?)(?=\n[^\n]{0,180}?\bCodi\s*:?\s*\d{5,}|$)/gi;const a=[];let m;while((m=re.exec(s)))a.push(m[1].trim());return a.length?a:s.split(/(?=\n?[^\n]{0,180}?\bCodi\s*:?\s*\d{5,})/i).map(x=>x.trim()).filter(x=>x.length>80);}
  function addr(b){const m=one(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:?\s*(.*?)(?=\s+Districte\s*:|\s+Barri\s*:|\s+Not[ií]cia\s*:|\s+Descripci[oó]\s*:|$)/i);if(m)return cleanAddress(m[2])||cleanAddress(m[1]);return cleanAddress(g(b,/Adre[cç]a\s*:?\s*([^\n]+)/i));}
  function loc(b){const m=one(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:/i);return m?cleanAddress(m[1]):g(b,/Loc\s*:?\s*([^\n]+)/i);}
  function parseMossos(text,file){const sv=blocks(text).map(function(b,i){const id=g(b,/Codi\s*:?\s*(\d{5,})/i)||('ME-'+i);const type=g(b,/^\s*([^\n]{3,120}?)\s+Codi\s*:?\s*\d{5,}/i);const tit=g(b,/Titular\s*:?\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i);const title=one([type,tit].filter(Boolean).join(' · '))||'Servei Mossos importat';const dt=g(b,/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i);const ad=addr(b);const lc=loc(b);const desc=g(b,/(?:Not[ií]cia|Noticia|Descripci[oó]|Descripcio)\s*:?\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i)||one(b).slice(0,650);const cat=typeof category==='function'?category(title,desc):'Altres';const pr=typeof priority==='function'?priority(title,desc,cat):'low';return build({serviceId:id,dateTime:dt,title,address:ad,detail:lc,desc:desc,cat:cat,pr:pr,sourceType:'MOSSOS',index:i,prefix:'me'});}).filter(Boolean);const ds={key:(file||'mossos')+'-'+Date.now()+'-'+sv.length+'-MOSSOS-HF',addedAt:new Date().toISOString(),source:{document:file,origin:typeof sName==='function'?sName('MOSSOS'):'Mossos',sourceType:'MOSSOS',reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services:sv,hotspots:sv.filter(x=>x.priority!=='low'),timeline:[...sv].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,120)};ds.summary=typeof summary==='function'?summary(sv,1):{total:sv.length};ds.sourceStats=typeof stats==='function'?stats(sv):{MOSSOS:sv.length,PL:0,ALTRES:0};return ds;}
  const oldHandle=typeof handle==='function'?handle:null;
  if(oldHandle){const h=async function(e){const f=e.target.files&&e.target.files[0];if(!f)return;try{if(typeof status==='function')status('importStatus','Informe rebut: '+f.name);const bar=document.getElementById('importProgress');if(bar)bar.style.width='8%';const text=await pdfText(f);if(text.length<80){if(typeof status==='function')status('importStatus','No es pot extreure text útil del PDF.','error');return}PENDING=isMossos(text)?parseMossos(text,f.name):parse(text,f.name);if(!PENDING.services.length){if(typeof status==='function')status('importStatus','PDF llegit, però no s\'han detectat serveis operatius compatibles.','warning');return}const p=document.getElementById('importPreview');if(p)p.innerHTML='<div><span>Origen</span><strong>'+(PENDING.source.sourceType==='MOSSOS'?'ME':PENDING.source.sourceType)+'</strong></div><div><span>Serveis</span><strong>'+PENDING.services.length+'</strong></div><div><span>Alta</span><strong>'+PENDING.summary.high+'</strong></div><div><span>Mitjana</span><strong>'+PENDING.summary.medium+'</strong></div>';if(bar)bar.style.width='100%';if(typeof status==='function')status('importStatus','Anàlisi completada: '+PENDING.services.length+' serveis.','success');['applyPanel','addHistory'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=false;});}catch(err){if(typeof status==='function')status('importStatus','Error important informe: '+(err.message||err),'error')}finally{e.target.value=''}};try{handle=h;}catch(e){}window.handle=h;}
  window.SIPDA_MOSSOS_HOTFIX={build:BUILD,parse:parseMossos,isMossos:isMossos,handle:!!oldHandle};
})();
