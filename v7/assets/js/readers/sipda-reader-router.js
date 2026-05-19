/* SIPDA v7 · PDF reader router */
(function(){
  const BUILD='reader-router-2026-05-20';
  function choose(text,file){
    const me=window.SIPDA_READER_ME;
    const pl=window.SIPDA_READER_PL;
    try{if(me&&me.detect&&me.detect(text,file))return me;}catch(e){}
    try{if(pl&&pl.detect&&pl.detect(text,file))return pl;}catch(e){}
    return pl||me||null;
  }
  function parseWithReader(text,file){
    const reader=choose(text,file);
    if(reader&&reader.parse)return reader.parse(text,file);
    if(typeof parse==='function')return parse(text,file);
    return {key:(file||'pdf')+'-'+Date.now(),source:{document:file,sourceType:'ALTRES',reports:1},services:[],hotspots:[],timeline:[],summary:{total:0},sourceStats:{PL:0,MOSSOS:0,ALTRES:0}};
  }
  const oldHandle=typeof handle==='function'?handle:(window.handle||null);
  if(oldHandle){
    const routedHandle=async function(e){
      const f=e.target.files&&e.target.files[0];
      if(!f)return;
      try{
        if(typeof status==='function')status('importStatus','Informe rebut: '+f.name);
        const bar=document.getElementById('importProgress');
        if(bar)bar.style.width='8%';
        const text=await pdfText(f);
        if(text.length<80){
          if(typeof status==='function')status('importStatus','No es pot extreure text útil del PDF.','error');
          return;
        }
        PENDING=parseWithReader(text,f.name);
        if(!PENDING.services.length){
          if(typeof status==='function')status('importStatus','PDF llegit, però no s’han detectat serveis operatius compatibles.','warning');
          return;
        }
        const preview=document.getElementById('importPreview');
        if(preview){
          preview.innerHTML='<div><span>Origen</span><strong>'+(PENDING.source.sourceType==='MOSSOS'?'ME':PENDING.source.sourceType)+'</strong></div><div><span>Serveis</span><strong>'+PENDING.services.length+'</strong></div><div><span>Alta</span><strong>'+(PENDING.summary.high||0)+'</strong></div><div><span>Mitjana</span><strong>'+(PENDING.summary.medium||0)+'</strong></div>';
        }
        if(bar)bar.style.width='100%';
        if(typeof status==='function')status('importStatus','Anàlisi completada amb lector '+(PENDING.source.sourceType==='MOSSOS'?'ME':'PL')+': '+PENDING.services.length+' serveis.','success');
        ['applyPanel','addHistory'].forEach(function(id){const b=document.getElementById(id);if(b)b.disabled=false;});
      }catch(err){
        if(typeof status==='function')status('importStatus','Error important informe: '+(err.message||err),'error');
      }finally{
        e.target.value='';
      }
    };
    try{handle=routedHandle;}catch(e){}
    window.handle=routedHandle;
    document.addEventListener('DOMContentLoaded',function(){
      const input=document.getElementById('pdfInput');
      if(input){
        input.onchange=null;
        input.addEventListener('change',routedHandle);
      }
    });
  }
  window.SIPDA_READER_ROUTER={build:BUILD,choose:choose,parse:parseWithReader,handle:!!oldHandle};
})();
