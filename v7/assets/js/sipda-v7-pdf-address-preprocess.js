/* SIPDA v7 · PDF address preprocessor
   Rebuilds broken address lines before the parser reads the PDF text.
*/
(function(){
  const BUILD='pdf-address-preprocess-2026-05-20';
  const ROAD=/^(AV|AV\.|AVDA|AVDA\.|AVGDA|AVGDA\.|AVINGUDA|C|C\.|C\/|CL|CL\.|CR|CR\.|CARRER|PL|PL\.|PÇA|PCA|PLAÇA|PLACA|PG|PG\.|PS|PS\.|PASSEIG|CTRA|CTRA\.|CARRETERA|RBLA|RBLA\.|RAMBLA|PTGE|PTGE\.|PASSATGE|TRAV|TRAV\.|TRAVESSERA|CAMI|CAMÍ|URB|URB\.)$/i;
  const LABEL=/^(via\s*1|adre[cç]a|adreca|ubicaci[oó]|ubicacio|lloc|lloc\s+detall|loc)$/i;
  const HARD_STOP=/^(dia i hora|servei|incident|requeriment|nivell|prioritat|via\s*2|titular|responsable|inici|final|resultats|cronologia|not[ií]cia|noticia|descripci[oó]|descripcio|hora inici|unitat|estad[ií]stica|codi)$/i;
  const NUM_LABEL=/^(n[uú]m\.?\s*via|num\.?\s*via|n[uú]mero\s*via|numero\s*via|portal|n[uú]mero|numero)$/i;
  const SKIP=/^(localitzaci[oó]|localizacion|tipus\s+via|tipo\s+via|nom\s+via|nombre\s+via)$/i;

  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function isLabel(line,next){
    const a=norm(line),b=norm(next||'');
    return LABEL.test(clean(line)) || (a==='via' && b==='1');
  }
  function skipCount(line,next){return norm(line)==='via'&&norm(next||'')==='1'?2:1;}
  function joinParts(parts){
    const filtered=parts.map(clean).filter(Boolean).filter(x=>!SKIP.test(x));
    if(!filtered.length)return '';
    let out=[];
    for(let i=0;i<filtered.length;i++){
      const p=filtered[i];
      if(NUM_LABEL.test(p)){
        const n=filtered[i+1]||'';
        if(/^\d{1,4}[A-Za-zÀ-ÿ]?$/.test(n)){out.push(', '+n);i++;}
        continue;
      }
      out.push(p);
    }
    return out.join(' ').replace(/\s+,\s*/g,', ').replace(/\s+/g,' ').trim();
  }
  function rebuildAddresses(text){
    const lines=String(text||'').replace(/\r/g,'\n').split('\n').map(x=>x.trim());
    const out=[];
    for(let i=0;i<lines.length;i++){
      const line=clean(lines[i]);
      if(!isLabel(line,lines[i+1])){out.push(lines[i]);continue;}
      const start=i+skipCount(line,lines[i+1]);
      const parts=[];
      for(let j=start;j<Math.min(lines.length,start+14);j++){
        const current=clean(lines[j]);
        if(!current)continue;
        if(HARD_STOP.test(norm(current)))break;
        if(isLabel(current,lines[j+1])&&j>start)break;
        if(SKIP.test(norm(current)))continue;
        parts.push(current);
        const merged=joinParts(parts);
        if((ROAD.test(parts[0]||'')||/^(AVINGUDA|CARRER|PLAÇA|PASSEIG|CARRETERA|RAMBLA|PASSATGE|CAMÍ|URBANITZACIÓ)/i.test(merged))&&/\d{1,4}/.test(merged)){
          i=j;
          break;
        }
      }
      const rebuilt=joinParts(parts);
      out.push('Via 1: '+(rebuilt||line));
    }
    return out.join('\n');
  }

  const oldPdfText=typeof pdfText==='function'?pdfText:(window.pdfText||null);
  if(oldPdfText){
    const wrappedPdfText=async function(file){
      const text=await oldPdfText(file);
      return rebuildAddresses(text);
    };
    try{pdfText=wrappedPdfText;}catch(e){}
    window.pdfText=wrappedPdfText;
  }
  window.SIPDA_PDF_ADDRESS_PREPROCESS={build:BUILD,rebuild:rebuildAddresses,wrapped:!!oldPdfText};
})();
