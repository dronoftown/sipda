/* SIPDA v7 · PL reader stable override
   Solo refuerza Policía Local. Mossos queda delegado al lector base que ya funciona.
*/
(function(){
  const BUILD='pl-reader-override-2026-05-20';
  const baseParse=typeof parse==='function'?parse:null;
  const baseDetect=typeof detect==='function'?detect:null;

  function R(v){return String(v||'').replace(/\r/g,'\n');}
  function O(v){return R(v).replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim();}
  function N(v){return O(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function G(t,re){const m=String(t||'').match(re);return m&&m[1]?O(m[1]):'';}
  function S(t,d){try{return typeof summary==='function'?summary(t,d):null;}catch(e){return null;}}
  function ST(t){try{return typeof stats==='function'?stats(t):null;}catch(e){return null;}}
  function C(t,d){try{return typeof category==='function'?category(t,d):'Altres';}catch(e){return'Altres';}}
  function P(t,d,c){try{return typeof priority==='function'?priority(t,d,c):'low';}catch(e){return'low';}}
  function B(o){try{return typeof build==='function'?build(o):fallback(o);}catch(e){return fallback(o);}}
  function fallback(o){const z=o.address||o.detail||'Ubicació pendent de validar';return{id:o.prefix+'-'+o.serviceId+'-'+o.index,serviceId:o.serviceId,time:'--:--',title:O(o.title).slice(0,160),category:o.cat,priority:o.pr,score:o.pr==='high'?9:o.pr==='medium'?6:3,zone:z,summary:O(o.desc).slice(0,520),sourceType:o.sourceType,sourceLabel:'Policia Local',sourceBadge:'PL',coordinates:[41.8162,3.0608]};}

  function cleanAddress(v){
    v=O(v).replace(/^\s*(?:LOCALITZACI[ÓO]|Via\s*1|Adre[cç]a|Adreca|Ubicaci[oó]|Ubicacio|Lloc|Zona|Sector)\s*:?\s*/i,'');
    v=v.replace(/^(ZO)\s+/i,'Zona ')
      .replace(/^(AV|AV\.|AVDA|AVGDA|AVINGUDA)\s+/i,'Avinguda ')
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
      .replace(/\s+,\s*/g,', ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function isPL(text,file){
    const x=N((file||'')+' '+text);let score=0;
    if(/dest[ií]\s*:?\s*policia local/.test(x))score+=7;
    if(/policia local|secretariapolicia@platjadaro\.com|ajuntament/.test(x))score+=5;
    if(/n[uú]m\.?\s*servei|num\.?\s*servei|servei\s*:/.test(x))score+=4;
    if(/localitzacio|localització|via\s*1/.test(x))score+=5;
    if(/dia i hora|requeriment|noticia|notícia/.test(x))score+=3;
    return score>=7;
  }

  function detectOverride(text,file){
    if(isPL(text,file))return 'PL';
    return baseDetect?baseDetect(text,file):'ALTRES';
  }

  function plBlocks(text){
    const s=R(text).trim();
    let a=s.split(/(?=\n?\s*(?:Dia i hora\s*:|N[uú]m\.?\s*Servei\s*:|Num\.?\s*Servei\s*:|Servei\s*:|Incident\s*:))/i).map(x=>x.trim()).filter(x=>x.length>80);
    if(a.length>1)return a;
    a=s.split(/(?=\n?\s*LOCALITZACI[ÓO])/i).map(x=>x.trim()).filter(x=>x.length>80);
    if(a.length>1)return a;
    a=s.split(/(?=\n?\s*Via\s*1\s*:)/i).map(x=>x.trim()).filter(x=>x.length>80);
    return a.length?a:[s];
  }

  function plAddress(block){
    const f=O(block);
    let m=f.match(/(?:LOCALITZACI[ÓO]\s+)?Via\s*1\s*:?\s*(.*?)(?=\s+(?:Bloc\s*:|Via\s*2|Descripci[oó]|Descripcio|Not[ií]cia|Noticia|Requeriment|CRONOLOGIA|Hora inici|ESTAD|Resultat|Unitat|Dia i hora|N[uú]m\.?\s*Servei|Num\.?\s*Servei)\b|$)/i);
    if(m&&m[1])return cleanAddress(m[1]);
    m=f.match(/\b((?:ZO|AV|AVDA|AVGDA|C|C\.|CL|CR|CARRER|PL|PÇA|PLAÇA|PG|PS|PASSEIG|CTRA|RBLA|PTGE|TRAV|CAM[IÍ]|URB)\s+[A-ZÀ-ÿ0-9'’.,\- ]{2,120}(?:\s+\d{1,4})?)\b/i);
    return m&&m[1]?cleanAddress(m[1]):'';
  }

  function parsePL(text,file){
    const services=plBlocks(text).map((block,index)=>{
      const id=G(block,/N[uú]m\.?\s*Servei\s*:?\s*(\d+)/i)||G(block,/Num\.?\s*Servei\s*:?\s*(\d+)/i)||G(block,/Servei\s*:?\s*([A-Z0-9\-\/]+)/i)||('PL-'+index);
      const dt=G(block,/Dia i hora\s*:?\s*([^\n]+)/i)||G(block,/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2})/i);
      const title=G(block,/NOTÍCIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(block,/NOTICIA\s*([\s\S]*?)(?:\n\s*Requeriment\s*:|\s+Requeriment\s*:|$)/i)||G(block,/Tipus(?:\s+d'incident)?\s*:?\s*([^\n]+)/i)||G(block,/Requeriment\s*:?\s*([^\n]+)/i)||'Servei Policia Local importat';
      const address=plAddress(block);
      const detail=G(block,/Lloc\s+detall\s*:?\s*([^\n]+)/i)||G(block,/Zona\s*:?\s*([^\n]+)/i)||G(block,/Sector\s*:?\s*([^\n]+)/i);
      const desc=G(block,/Descripci[oó]\s*:?\s*([\s\S]*?)(?:\n\s*Hora inici|\n\s*ESTAD|\n\s*Resultat|\n\s*Unitat|$)/i)||O(block).slice(0,700);
      if(!address&&!detail&&!/robatori|furt|accident|control|vigil|vehicle|alarma|assistencial|tr[aà]nsit|requeriment|localitzacio|noticia|notícia/i.test(title+' '+desc+' '+block))return null;
      const cat=C(title,desc),pr=P(title,desc,cat);
      return B({serviceId:id,dateTime:dt,title,address,detail,desc,cat,pr,sourceType:'PL',index,prefix:'pl'});
    }).filter(Boolean);
    const d={key:(file||'pl')+'-'+Date.now()+'-'+services.length+'-PL',addedAt:new Date().toISOString(),source:{document:file,origin:'Policia Local',sourceType:'PL',reports:1,privacy:'Importació local. El PDF no puja a servidor.',readerLock:BUILD},services,hotspots:services.filter(x=>x.priority!=='low'),timeline:[...services].sort((a,b)=>String(a.time).localeCompare(String(b.time))).slice(0,160)};
    d.summary=S(services,1)||{total:services.length,high:services.filter(x=>x.priority==='high').length,medium:services.filter(x=>x.priority==='medium').length,low:services.filter(x=>x.priority==='low').length,risk:'low',executive:'Lectura PL importada.',recommendation:'Revisar serveis PL detectats.'};
    d.sourceStats=ST(services)||{PL:services.length,MOSSOS:0,ALTRES:0};
    return d;
  }

  function parseOverride(text,file){
    window.SIPDA_LAST_READER=isPL(text,file)?'PL':'BASE';
    if(isPL(text,file))return parsePL(text,file);
    return baseParse?baseParse(text,file):{source:{document:file,sourceType:'ALTRES',reports:1},services:[],hotspots:[],timeline:[],summary:{total:0},sourceStats:{PL:0,MOSSOS:0,ALTRES:0}};
  }

  try{detect=detectOverride;}catch(e){}
  try{parse=parseOverride;}catch(e){}
  window.detect=detectOverride;
  window.parse=parseOverride;
  window.SIPDA_PL_READER_OVERRIDE={active:true,build:BUILD,isPL,parsePL,baseParse:!!baseParse};
})();
