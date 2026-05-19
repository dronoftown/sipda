/* SIPDA v7 hotfix: robust service block splitting for PL and ME reports. */
function blocks(text,type){
  const cleaned=String(text||'').replace(/\r/g,'\n').trim();
  if(type==='MOSSOS'){
    const mossos=cleaned
      .split(/(?=\n?[^\n]{3,160}\s+Codi\s*:\s*\d{5,})/i)
      .map(part=>part.trim())
      .filter(part=>/Codi\s*:\s*\d{5,}/i.test(part)&&part.length>120);
    if(mossos.length)return mossos;
  }
  const byService=cleaned
    .split(/(?=\n?\s*(?:Dia i hora:|Núm\. Servei:|Num\. Servei:|Servei:|Incident:))/i)
    .map(part=>part.trim())
    .filter(part=>part.length>80);
  if(byService.length)return byService;
  return cleaned.split(/\n\s*\n/g).map(part=>part.trim()).filter(part=>part.length>80);
}
