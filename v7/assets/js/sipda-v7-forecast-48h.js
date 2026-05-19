/* SIPDA v7 · predicció policial 48 h basada en PDF */
(function(){
  const BUILD='forecast-48h-pdf-2026-05-20';
  const previousRender=typeof render==='function'?render:(typeof window.render==='function'?window.render:null);
  function D(){try{if(typeof DATA!=='undefined'&&DATA)return DATA;}catch(e){}return window.DATA||{};}
  function S(){const d=D();return Array.isArray(d.services)?d.services:[];}
  function esc2(v){return typeof esc==='function'?esc(v):String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function count(p){return S().filter(x=>x.priority===p).length;}
  function hourBand(){const b={mati:0,tarda:0,vespre:0,nit:0};S().forEach(x=>{const m=String(x.time||'').match(/(\d{1,2})/);if(!m)return;const h=+m[1];if(h>=6&&h<14)b.mati++;else if(h>=14&&h<20)b.tarda++;else if(h>=20&&h<24)b.vespre++;else b.nit++;});const top=Object.entries(b).sort((a,b)=>b[1]-a[1])[0]||['sense franja',0];return {mati:'matí',tarda:'tarda',vespre:'vespre',nit:'nit / matinada'}[top[0]]||top[0];}
  function topBy(key,n){const m=new Map();S().forEach(x=>{const k=x[key]||'No determinat';const r=m.get(k)||{name:k,count:0,score:0};r.count++;r.score+=x.priority==='high'?9:x.priority==='medium'?6:3;m.set(k,r);});return [...m.values()].sort((a,b)=>b.score-a.score||b.count-a.count).slice(0,n||3);}
  function model(){
    const services=S(),total=services.length,high=count('high'),medium=count('medium'),low=count('low');
    const q=window.SIPDA_LAST_PDF_QUALITY;
    const quality=q?q.level:'pendent';
    const qualityPenalty=q&&q.score<55?20:q&&q.score<80?8:0;
    let riskScore=Math.min(100,Math.round((high*18+medium*9+low*3)+Math.min(total,25)*2-qualityPenalty));
    if(!total)riskScore=0;
    const level=riskScore>=75?'alt':riskScore>=50?'moderat-alt':riskScore>=30?'moderat':'baix';
    const zones=topBy('zone',3);const cats=topBy('category',2);const band=hourBand();
    const confidence=!total?'baixa':(q&&q.score<55?'baixa':(total>=8&&(!q||q.score>=55)?'alta':'mitjana'));
    const error=confidence==='alta'?'±10%':confidence==='mitjana'?'±15%':'±25%';
    let action='Mantenir patrullatge ordinari i actualitzar la predicció amb nous informes.';
    if(high>0)action='Prioritzar seguiment tàctic dels serveis d’alta prioritat i reforçar presència preventiva a les zones més recurrents.';
    else if(medium>=3)action='Reforçar patrullatge preventiu i control de recurrències en les zones i franges dominants.';
    const reading=total?`Predicció 48 h basada en ${total} serveis extrets dels PDF. Risc ${level} amb concentració principal a ${zones.map(z=>z.name).join(', ')||'sense zona dominant'} i franja dominant de ${band}.`:'Carrega informes PDF per activar la predicció policial 48 h.';
    return {total,high,medium,low,riskScore,level,zones,cats,band,confidence,error,quality,action,reading};
  }
  function renderForecast(){
    const grid=document.getElementById('sourcePredictionGrid');if(!grid)return;
    const m=model();
    grid.innerHTML='<article class="prediction-card pdf48"><div class="prediction-card-head"><div><b class="source-chip other">48H</b><h3>Predicció policial conjunta</h3></div><em class="priority-badge '+(m.riskScore>=75?'high':m.riskScore>=35?'medium':'low')+'">'+esc2(m.level)+'</em></div><div class="prediction-kpis"><span><b>'+m.riskScore+'</b>risc</span><span><b>'+m.error+'</b>marge</span><span><b>'+esc2(m.confidence)+'</b>fiabilitat</span></div><p>'+esc2(m.reading)+'</p><small>Base: informes PDF carregats · qualitat lectura: '+esc2(m.quality)+'. '+esc2(m.action)+'</small></article>'+
      '<article class="prediction-card pdf48-detail"><div class="prediction-card-head"><div><b class="source-chip other">IA</b><h3>Factors detectats</h3></div></div><div class="prediction-kpis"><span><b>'+m.high+'</b>alta</span><span><b>'+m.medium+'</b>mitjana</span><span><b>'+m.low+'</b>baixa</span></div><p><b>Zones:</b> '+esc2(m.zones.map(z=>z.name).join(' · ')||'no determinades')+'</p><small><b>Patró:</b> '+esc2(m.cats.map(c=>c.name).join(' · ')||'no determinat')+' · franja '+esc2(m.band)+'.</small></article>';
  }
  function wrapped(){if(previousRender)previousRender.apply(this,arguments);renderForecast();}
  try{render=wrapped;}catch(e){}window.render=wrapped;
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(renderForecast,500);setTimeout(renderForecast,1500);});
  window.SIPDA_FORECAST_48H={build:BUILD,model,render:renderForecast};
})();

/* SIPDA v7 · final PDF controller PL/ME */
(function(){
  const BUILD='final-pdf-controller-pl-priority-2026-05-20';
  const CENTER=[41.8162,3.0608];
  function R(v){return String(v||'').replace(/\r/g,'\n')}
  function O(v){return R(v).replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim()}
  function N(v){return O(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function G(t,re){const m=String(t||'').match(re);return m&&m[1]?O(m[1]):''}
  function TM(v){try{return typeof time==='function'?time(v):'--:--'}catch(e){return'--:--'}}
  function SB(t){return t==='MOSSOS'?'ME':t==='PL'?'PL':'--'}
  function SN(t){return t==='MOSSOS'?"Mossos d'Esquadra":t==='PL'?'Policia Local':'Altres'}
  function CAT(t,d){try{return typeof category==='function'?category(t,d):'Altres'}catch(e){return'Altres'}}
  function PRI(t,d,c){try{return typeof priority==='function'?priority(t,d,c):'low'}catch(e){return'low'}}
  function SC(p){return p==='high'?9:p==='medium'?6:3}
  function CRS(z,i,t){try{return typeof coords==='function'?coords(z,i,t):CENTER}catch(e){return CENTER}}
  function ADR(v){v=O(v).replace(/^\s*(?:LOCALITZACI[ÓO]|Via\s*1|Adre[cç]a|Ubicaci[oó]|Lloc|Loc)\s*:?\s*/i,'');v=v.replace(/^(ZO)\s+/i,'Zona ').replace(/^(AV|AV\.|AVDA|AVGDA|AVINGUDA)\s+/i,'Avinguda ').replace(/^(C|C\.|CL|CR|CARRER)\s+/i,'Carrer ').replace(/^(PL|PÇA|PLAÇA)\s+/i,'Plaça ').replace(/^(PG|PS|PASSEIG)\s+/i,'Passeig ').replace(/^(CTRA|CARRETERA)\s+/i,'Carretera ').replace(/^(RBLA|RAMBLA)\s+/i,'Rambla ').replace(/^(PTGE|PASSATGE)\s+/i,'Passatge ').replace(/^(TRAV|TRAVESSERA)\s+/i,'Travessera ').replace(/^(CAMI|CAMÍ)\s+/i,'Camí ').replace(/^(URB|URBANITZACIÓ|URBANITZACIO)\s+/i,'Urbanització ');return v.replace(/\bS\s*['’]?\s*AGARO\b/gi,"S'Agaró").replace(/\bS\s*['’]?\s*AGARÓ\b/gi,"S'Agaró").replace(/\bPLATJA\s+D\s*['’]?\s*ARO\b/gi,"Platja d'Aro").replace(/\bCASTELL\s+D\s*['’]?\s*ARO\b/gi,"Castell d'Aro").replace(/\b0{3,}(\d{1,4})(?:\.0)?\b/g,'$1').replace(/\s+,\s*/g,', ').replace(/\s+/g,' ').trim()}
  function service(o){const z=ADR(o.address||o.detail||'Ubicació pendent de validar');return{id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:TM(o.dateTime),title:O(o.title).slice(0,160),category:o.cat,priority:o.pr,score:SC(o.pr),zone:z,address:z,displayAddress:z,summary:O(o.desc).slice(0,560),sourceType:o.sourceType,sourceLabel:SN(o.sourceType),sourceBadge:SB(o.sourceType),coordinates:CRS(z,o.index,o.sourceType)}}
  function dataset(file,type,services){const ds={key:(file||type)+'-'+Date.now()+'-'+services.length+'-'+type,addedAt:new Date().toISOString(),source:{document:file,origin:SN(type),sourceType:type,reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,160)};try{ds.summary=summary(services,1);ds.sourceStats=stats(services)}catch(e){ds.summary={total:services.length,high:services.filter(x=>x.priority==='high').length,medium:services.filter(x=>x.priority==='medium').length,low:services.filter(x=>x.priority==='low').length,risk:'low',executive:'Lectura PDF importada.',recommendation:'Revisar serveis detectats.'};ds.sourceStats={PL:type==='PL'?services.length:0,MOSSOS:type==='MOSSOS'?services.length:0,ALTRES:0}}return ds}
  function isPL(text,file){const x=N((file||'')+' '+text);let score=0;if(/dest[ií]\s*:?\s*policia local/.test(x))score+=5;if(/policia local|secretariapolicia@platjadaro\.com/.test(x))score+=4;if(/n[uú]m\.?\s*servei|num\.?\s*servei/.test(x))score+=4;if(/localitzacio|localització|via\s*1/.test(x))score+=4;if(/dia i hora|requeriment/.test(x))score+=2;return score>=6}
  function isME(text,file){const x=N((file||'')+' '+text);let score=0;if(/mossos d|policia de la generalitat|cos de mossos|usc sant feliu/.test(x))score+=5;if(/codi\s*:?\s*\d{5,}/.test(x))score+=4;if(/titular\s*:|responsable\s*:|loc\s*:.*adre[cç]a\s*:/.test(x))score+=3;if(/pg\s*-?\s*me/.test(x))score+=1;return score>=5&&!isPL(text,file)}
  function plBlocks(text){const s=R(text).trim();let a=s.split(/(?=\n?\s*(?:Dia i hora\s*:|N[uú]m\.?\s*Servei\s*:|Num\.?\s*Servei\s*:|Servei\s*:|Incident\s*:))/i).map(x=>x.trim()).filter(x=>x.length>80);if(a.length>1)return a;a=s.split(/(?=\n?\s*LOCALITZACI[ÓO])/i).map(x=>x.trim()).filter(x=>x.length>80);return a.length?a:[s]}
  function plAddress(block){const f=O(block);let m=f.match(/(?:LOCALITZACI[ÓO]\s+)?Via\s*1\s*:?\s*(.*?)(?=\s+(?:Bloc\s*:|Via\s*2|Descripci[oó]|Descripcio|Not[ií]cia|Noticia|Requeriment|CRONOLOGIA|Hora inici|ESTAD|Resultat|Unitat|Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei)\b|$)/i);if(m&&m[1])return ADR(m[1]);m=f.match(/\b((?:ZO|AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{2,120}(?:\s+\d{1,4})?)\b/i);return m&&m[1]?ADR(m[1]):''}
  function parsePL(text,file){const sv=plBlocks(text).map((b,i)=>{const id=G(b,/N[uú]m\.?\s*Servei\s*:?\s*(\d+)/i)||G(b,/Num\.?\s*Servei\s*:?\s*(\d+)/i)||G(b,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i)||('PL-'+i);const dt=G(b,/Dia i hora\s*:?\s*([^\n]+)/i)||G(b,/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i);const title=G(b,/NOTÍCIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(b,/NOTICIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(b,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i)||'Servei Policia Local importat';const ad=plAddress(b);const detail=G(b,/Lloc\s+detall\s*:?\s*([^\n]+)/i)||G(b,/Zona\s*:?\s*([^\n]+)/i)||G(b,/Sector\s*:?\s*([^\n]+)/i);const desc=G(b,/Descripci[oó]\s*:?\s*([\s\S]*?)(?:\n\s*Hora inici|\n\s*ESTAD|\n\s*Resultat|\n\s*Unitat|$)/i)||O(b).slice(0,700);if(!ad&&!detail&&!/robatori|furt|accident|control|vigil|vehicle|alarma|assistencial|tr[aà]nsit|requeriment|localitzacio/i.test(title+' '+desc+' '+b))return null;const c=CAT(title,desc),p=PRI(title,desc,c);return service({serviceId:id,dateTime:dt,title,address:ad,detail,desc,cat:c,pr:p,sourceType:'PL',index:i,prefix:'pl'})}).filter(Boolean);return dataset(file,'PL',sv)}
  function meBlocks(text){const s=R(text);const re=/(?:^|\n)([^\n]{0,180}?\bCodi\s*:?\s*\d{5,}[\s\S]*?)(?=\n[^\n]{0,180}?\bCodi\s*:?\s*\d{5,}|$)/gi;const out=[];let m;while((m=re.exec(s)))out.push(m[1].trim());return out.length?out:s.split(/(?=\n?[^\n]{0,180}?\bCodi\s*:?\s*\d{5,})/i).map(x=>x.trim()).filter(x=>x.length>80)}
  function meLoc(b){const m=O(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:/i);return m?ADR(m[1]):G(b,/Loc\s*:?\s*([^\n]+)/i)}
  function meAddress(b){const m=O(b).match(/Loc\s*:?\s*(.*?)\s+Adre[cç]a\s*:?\s*(.*?)(?=\s+Districte\s*:|\s+Barri\s*:|\s+Not[ií]cia\s*:|\s+Noticia\s*:|\s+Descripci[oó]\s*:|\s+Resultats\s*:|\s+Cronologia\s*:|$)/i);if(m&&m[2])return ADR(m[2]);return ADR(G(b,/Adre[cç]a\s*:?\s*([^\n]+)/i))}
  function parseME(text,file){const sv=meBlocks(text).map((b,i)=>{const id=G(b,/Codi\s*:?\s*(\d{5,})/i)||('ME-'+i);const typ=G(b,/^\s*([^\n]{3,140}?)\s+Codi\s*:?\s*\d{5,}/i);const tit=G(b,/Titular\s*:?\s*([\s\S]*?)(?:\s+Responsable\s*:|\n\s*Responsable\s*:|$)/i);const title=O([typ,tit].filter(Boolean).join(' · '))||'Servei Mossos importat';const dt=G(b,/Inici\s*:?\s*([0-9/.-]+\s+[0-9:]+)/i)||G(b,/Data(?:\s+i\s+hora)?\s*:?\s*([^\n]+)/i);const ad=meAddress(b),detail=meLoc(b);const desc=G(b,/(?:Not[ií]cia|Noticia|Descripci[oó]|Descripcio)\s*:?\s*([\s\S]*?)(?:\n\s*Lloc\/Tipus lloc|\n\s*Data accept|\n\s*Resultats\s*:|\n\s*Cronologia dels fets\s*:|$)/i)||O(b).slice(0,650);const c=CAT(title,desc),p=PRI(title,desc,c);return service({serviceId:id,dateTime:dt,title,address:ad,detail,desc,cat:c,pr:p,sourceType:'MOSSOS',index:i,prefix:'me'})}).filter(Boolean);return dataset(file,'MOSSOS',sv)}
  function parseStable(text,file){const reader=isPL(text,file)?'PL':isME(text,file)?'MOSSOS':'AUTO';window.SIPDA_LAST_READER=reader;return reader==='PL'?parsePL(text,file):reader==='MOSSOS'?parseME(text,file):(typeof parse==='function'?parse(text,file):dataset(file,'ALTRES',[]))}
  async function controller(e){const input=e.target;if(!input||input.id!=='pdfInput')return;e.preventDefault();e.stopImmediatePropagation();const f=input.files&&input.files[0];if(!f)return;try{if(typeof status==='function')status('importStatus','Informe rebut: '+f.name);const bar=document.getElementById('importProgress');if(bar)bar.style.width='8%';const text=await pdfText(f);window.SIPDA_LAST_PDF_TEXT=text;PENDING=parseStable(text,f.name);if(!PENDING.services.length){if(typeof status==='function')status('importStatus','PDF llegit amb lector '+window.SIPDA_LAST_READER+', però no s’han detectat serveis operatius.','warning');return;}const p=document.getElementById('importPreview');if(p)p.innerHTML='<div><span>Lector</span><strong>'+(PENDING.source.sourceType==='MOSSOS'?'ME':PENDING.source.sourceType)+'</strong></div><div><span>Serveis</span><strong>'+PENDING.services.length+'</strong></div><div><span>Alta</span><strong>'+(PENDING.summary.high||0)+'</strong></div><div><span>Mitjana</span><strong>'+(PENDING.summary.medium||0)+'</strong></div>';if(bar)bar.style.width='100%';if(typeof status==='function')status('importStatus','Anàlisi completada amb lector '+(PENDING.source.sourceType==='MOSSOS'?'ME':'PL')+': '+PENDING.services.length+' serveis.','success');['applyPanel','addHistory'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=false});}catch(err){if(typeof status==='function')status('importStatus','Error important informe: '+(err.message||err),'error')}finally{input.value='';}}
  document.addEventListener('change',controller,true);
  window.handle=controller;
  window.SIPDA_FINAL_PDF_CONTROLLER={build:BUILD,active:true,parse:parseStable,isPL,isME};
})();
