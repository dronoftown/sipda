/* SIPDA v7 · force reliable Policia Local origin detection.
   This file intentionally loads after the base engine and overrides detect/parse.
*/
(function(){
  function n(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9@.\s_-]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function compact(value){return n(value).replace(/\s+/g,'')}
  function head(text,file){return n(`${file||''}\n${String(text||'').slice(0,9000)}`)}

  function isPoliciaLocalReport(text,file){
    const h=head(text,file);
    const f=n(`${file||''}\n${text||''}`);
    const c=compact(`${file||''}\n${text||''}`);
    const directSignals=[
      /\bpolicia\s+local\b/,
      /\bdesti\s*:?\s*policia\s+local\b/,
      /\bdestino\s*:?\s*policia\s+local\b/,
      /\bn[uú]m\.?\s+servei\b/,
      /\bnum\.?\s+servei\b/,
      /\bservei\s*:\s*\d{4,}\b/,
      /\bnivell\s+prioritat\b/,
      /\brequeriment\b/,
      /\blocalitzacio\b/,
      /\bvia\s+1\b/,
      /\blloc\s+detall\b/,
      /\bagents\s+actuants\b/,
      /\bestadistica\b/,
      /\bsecretariapolicia@platjadaro\.com\b/,
      /\bav\s+s\s*agaro\s+161\b/,
      /\bcastell\s+d\s*aro\b/,
      /\bplatja\s+d\s*aro\b/,
      /\bs\s*agaro\b/
    ];
    const score=directSignals.reduce((total,re)=>total+(re.test(h)||re.test(f)?1:0),0);
    return score>=2 || c.includes('policialocal') || c.includes('secretariapolicia@platjadaro.com') || c.includes('castellplatjadaro');
  }

  function isMossosReport(text,file){
    const h=head(text,file);
    const c=compact(`${file||''}\n${text||''}`);
    return (
      /\bmossos\s+d\s*esquadra\b/.test(h)||
      /\bpolicia\s+de\s+la\s+generalitat\b/.test(h)||
      /\bcos\s+de\s+mossos\b/.test(h)||
      /\bpg\s*-?\s*me\b/.test(h)&&/\bcodi\s*:\s*\d{5,}\b/.test(h)||
      /\busc\s+sant\s+feliu\s+de\s+guixols\b/.test(h)||
      c.includes('uscsantfeliudeguixols')||
      c.includes('mossosdesquadra')||
      c.includes('policiadelageneralitat')
    );
  }

  window.detect=function detect(text,file){
    if(isPoliciaLocalReport(text,file))return 'PL';
    if(isMossosReport(text,file))return 'MOSSOS';
    return 'ALTRES';
  };

  const originalParseBlock=window.parseBlock||parseBlock;
  window.parse=function parse(text,file){
    const sourceType=window.detect(text,file);
    const source=sourceType==='MOSSOS'?'MOSSOS':sourceType==='PL'?'PL':'ALTRES';
    const parts=blocks(text,source);
    const services=parts.map((block,index)=>originalParseBlock(block,index,source)).filter(Boolean).map(item=>({
      ...item,
      sourceType:source,
      sourceLabel:sName(source),
      sourceBadge:source==='PL'?'PL':source==='MOSSOS'?'ME':'--'
    }));
    const dataset={
      key:`${file}-${Date.now()}-${services.length}`,
      addedAt:new Date().toISOString(),
      source:{document:file,origin:sName(source),sourceType:source,reports:1,privacy:'Importació local. El PDF no puja a servidor.'},
      services,
      hotspots:services.filter(item=>item.priority!=='low'),
      timeline:[...services].sort((a,b)=>a.time.localeCompare(b.time)).slice(0,60)
    };
    dataset.summary=summary(services,1);
    dataset.sourceStats=stats(services);
    return dataset;
  };

  window.SIPDA_V7_ORIGIN_FORCE_PL={isPoliciaLocalReport,isMossosReport,detect:window.detect,parse:window.parse};
})();
