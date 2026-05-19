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
    return v.replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró").replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró").replace(/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro").replace(/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro").replace(/\s+,\s*/g,', ').replace(/\s+/g,' ').trim();
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
      let parts=[];
      const inline=clean(lines[i]);
      if(inline&&inline!==raw(lines[i]))parts.push(inline);
      let start=(norm(lines[i])==='via'&&isViaOne(lines[i+1]))?i+2:i+1, end=i;
      for(let j=start;j<Math.min(lines.length,start+14);j++){
        const cur=clean(lines[j]); if(!cur)continue; if(STOP.test(norm(cur)))break; if(isLabel(cur,lines[j+1])&&j>start)break; if(SKIP.test(norm(cur)))continue;
        parts.push(cur); end=j; const merged=join(parts);
        if((ROAD.test(parts[0]||'')||STREET.test(merged))&&/\d{1,4}/.test(merged))break;
      }
      const merged=join(parts); out.push('Via 1: '+(merged||clean(lines[i]))); i=end;
    }
    return out.join('\n');
  }
  function extract(text){
    const s=raw(text); if(!s)return '';
    const m=s.match(/(?:Via\s*1|Adre[cç]a|Ubicaci[oó]|Lloc|Loc)\s*:?\s*((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB|Avinguda|Carrer|Plaça|Passeig|Carretera)[^.;|\n]{3,150})/i)||s.match(/\b((?:AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{3,120})/i);
    return m&&m[1]?street(m[1]):'';
  }
  function best(o){
    const a=[o&&o.address,o&&o.displayAddress,o&&o.zone,o&&o.location,o&&o.detail,extract(o&&o.desc),extract(o&&o.summary)].map(street).filter(x=>x&&!BAD.test(x));
    return a.find(x=>STREET.test(x))||a[0]||'Ubicació pendent de validar';
  }
  const oldPdf=typeof pdfText==='function'?pdfText:window.pdfText;
  if(oldPdf){const wrapped=async function(file){const t=await oldPdf.apply(this,arguments);const r=rebuild(t);window.SIPDA_LAST_PDF_TEXT=r;window.SIPDA_LAST_PDF_TEXT_ORIGINAL=t;return r;};try{pdfText=wrapped;}catch(e){}window.pdfText=wrapped;}
  function coord(z,o){try{return typeof coords==='function'?coords(z,o&&o.index,o&&o.sourceType):[41.8162,3.0608];}catch(e){return[41.8162,3.0608];}}
  function finalBuild(o){o=o||{};const z=best(o);return{id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:typeof time==='function'?time(o.dateTime):'--:--',title:(typeof line==='function'?line(o.title):raw(o.title)).slice(0,160),category:o.cat,priority:o.pr,score:typeof score==='function'?score(o.pr):3,zone:z,displayAddress:z,address:z,summary:(typeof line==='function'?line(o.desc):raw(o.desc)).slice(0,520),sourceType:o.sourceType,sourceLabel:typeof sName==='function'?sName(o.sourceType):o.sourceType,sourceBadge:o.sourceType==='PL'?'PL':o.sourceType==='MOSSOS'?'ME':'--',coordinates:coord(z,o)};}
  try{build=finalBuild;}catch(e){}window.build=finalBuild;
  window.SIPDA_ADDRESS_FINAL={active:true,build:BUILD,rebuildPdfAddresses:rebuild,bestAddress:best,wrappedPdfText:!!oldPdf};
})();
