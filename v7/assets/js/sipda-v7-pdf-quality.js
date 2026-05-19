/* SIPDA v7 · control de calidad de lectura PDF */
(function(){
  const BUILD='pdf-quality-2026-05-20';
  const originalPdfText=typeof pdfText==='function'?pdfText:null;
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
  function count(re,text){return (String(text||'').match(re)||[]).length;}
  function quality(text,fileName){
    const raw=String(text||'');
    const n=norm(raw);
    const fields={
      serveis:count(/n[uú]m\.?\s*servei|num\.?\s*servei|codi\s*:?\s*\d{5,}/gi,raw),
      localitzacio:count(/localitzaci[oó]|ubicaci[oó]|adre[cç]a|via\s*1|lloc\s+detall/gi,raw),
      via1:count(/via\s*1\s*:?/gi,raw),
      dates:count(/dia\s+i\s+hora|inici\s*:?\s*\d|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2}/gi,raw),
      police:count(/policia\s+local|mossos\s+d['’ ]?esquadra|pg\s*-?\s*me|secretariapolicia@platjadaro\.com/gi,raw)
    };
    const addressCandidates=count(/(?:via\s*1|adre[cç]a|ubicaci[oó]|lloc)\s*:?\s*(?:av|avda|cl|c\.|carrer|pl|pça|plaça|ps|pg|passeig|ctra|carretera)\b/gi,raw);
    let score=0;
    if(raw.length>500)score+=20;
    if(raw.length>2500)score+=15;
    if(fields.serveis>0)score+=20;
    if(fields.localitzacio>0)score+=15;
    if(fields.via1>0||addressCandidates>0)score+=20;
    if(fields.dates>0)score+=10;
    if(fields.police>0)score+=10;
    score=Math.min(100,score);
    const level=score>=80?'alta':score>=55?'mitjana':score>=35?'baixa':'crítica';
    const usable=score>=55&&fields.serveis>0;
    const notes=[];
    if(!raw.length)notes.push('No s’ha extret text del PDF.');
    if(raw.length&&raw.length<500)notes.push('Text extret insuficient; possible PDF escanejat o mala capa OCR.');
    if(!fields.serveis)notes.push('No es detecten camps de servei.');
    if(!fields.localitzacio)notes.push('No es detecta bloc de localització/adreça.');
    if(!fields.via1&&!addressCandidates)notes.push('No es detecta Via 1 ni adreça operativa clara.');
    return {build:BUILD,fileName,chars:raw.length,score,level,usable,fields,addressCandidates,notes,preview:raw.slice(0,1800)};
  }
  function renderPanel(q){
    const docs=document.querySelector('#docs');
    if(!docs||!q)return;
    let box=document.getElementById('pdfQualityPanel');
    if(!box){
      box=document.createElement('div');
      box.id='pdfQualityPanel';
      docs.appendChild(box);
    }
    const color=q.level==='alta'?'success':q.level==='mitjana'?'warning':'error';
    box.className='pdf-quality '+color;
    box.innerHTML='<strong>Qualitat lectura PDF: '+q.level.toUpperCase()+' · '+q.score+'/100</strong>'+
      '<span>'+q.chars+' caràcters · serveis '+q.fields.serveis+' · localització '+q.fields.localitzacio+' · Via 1 '+q.fields.via1+'</span>'+
      (q.notes.length?'<small>'+q.notes.join(' ')+'</small>':'<small>Lectura vàlida per generar intel·ligència operativa i predicció 48 h.</small>');
  }
  function css(){
    if(document.getElementById('sipda-pdf-quality-css'))return;
    const s=document.createElement('style');
    s.id='sipda-pdf-quality-css';
    s.textContent='.pdf-quality{margin:12px 16px 0;border:1px solid var(--line);padding:12px;background:#fafafa;display:grid;gap:5px}.pdf-quality strong{font-size:12px;text-transform:uppercase;letter-spacing:.04em}.pdf-quality span{font-size:12px;color:#374151;font-weight:800}.pdf-quality small{font-size:11px;line-height:1.35;color:#6b7280;font-weight:750}.pdf-quality.success{border-left:5px solid var(--low)}.pdf-quality.warning{border-left:5px solid var(--med)}.pdf-quality.error{border-left:5px solid var(--high)}';
    document.head.appendChild(s);
  }
  if(originalPdfText){
    pdfText=async function(file){
      const text=await originalPdfText.apply(this,arguments);
      const q=quality(text,file&&file.name?file.name:'PDF');
      window.SIPDA_LAST_PDF_QUALITY=q;
      window.SIPDA_LAST_PDF_TEXT=text;
      css();renderPanel(q);
      const statusEl=document.getElementById('importStatus');
      if(statusEl){
        if(!q.usable){statusEl.textContent='Lectura PDF '+q.level+': revisa qualitat abans d’analitzar.';statusEl.className='status-text error';}
        else{statusEl.textContent='Lectura PDF '+q.level+' validada. Generant anàlisi operativa...';statusEl.className='status-text success';}
      }
      return text;
    };
  }
  document.addEventListener('DOMContentLoaded',css);
  window.SIPDA_PDF_QUALITY={build:BUILD,quality,renderPanel};
})();