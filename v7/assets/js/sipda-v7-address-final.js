/* SIPDA v7 · dedicated reader autoloader */
(function(){
  const BUILD='reader-autoloader-2026-05-20';
  function load(src){return new Promise(function(ok){if(document.querySelector('script[src*="'+src+'"]')){ok();return;}const s=document.createElement('script');s.src='./assets/js/readers/'+src+'?v='+(window.SIPDA_BUILD||Date.now());s.onload=ok;s.onerror=ok;document.head.appendChild(s);});}
  function attachRouter(){
    const oldHandle=typeof handle==='function'?handle:(window.handle||null);
    function choose(text,file){
      if(window.SIPDA_READER_ME&&window.SIPDA_READER_ME.detect(text,file))return window.SIPDA_READER_ME;
      if(window.SIPDA_READER_PL&&window.SIPDA_READER_PL.detect(text,file))return window.SIPDA_READER_PL;
      return null;
    }
    if(oldHandle){
      const routed=async function(e){
        const f=e.target.files&&e.target.files[0];if(!f)return;
        try{
          if(typeof status==='function')status('importStatus','Informe rebut: '+f.name);
          const bar=document.getElementById('importProgress');if(bar)bar.style.width='8%';
          const text=await pdfText(f);
          const reader=choose(text,f.name);
          PENDING=reader?reader.parse(text,f.name):parse(text,f.name);
          if(!PENDING.services.length){if(typeof status==='function')status('importStatus','PDF llegit, però no s’han detectat serveis operatius compatibles.','warning');return;}
          const p=document.getElementById('importPreview');
          if(p)p.innerHTML='<div><span>Lector</span><strong>'+(PENDING.source.sourceType==='MOSSOS'?'ME':'PL')+'</strong></div><div><span>Serveis</span><strong>'+PENDING.services.length+'</strong></div><div><span>Alta</span><strong>'+(PENDING.summary.high||0)+'</strong></div><div><span>Mitjana</span><strong>'+(PENDING.summary.medium||0)+'</strong></div>';
          if(bar)bar.style.width='100%';
          if(typeof status==='function')status('importStatus','Anàlisi completada amb lector '+(PENDING.source.sourceType==='MOSSOS'?'ME':'PL')+': '+PENDING.services.length+' serveis.','success');
          ['applyPanel','addHistory'].forEach(function(id){const b=document.getElementById(id);if(b)b.disabled=false;});
        }catch(err){if(typeof status==='function')status('importStatus','Error important informe: '+(err.message||err),'error');}
        finally{e.target.value='';}
      };
      try{handle=routed;}catch(e){}window.handle=routed;
      const input=document.getElementById('pdfInput');
      if(input){const clone=input.cloneNode(true);input.parentNode.replaceChild(clone,input);clone.addEventListener('change',routed);}
    }
    window.SIPDA_READER_AUTOLOADER={build:BUILD,loaded:true,router:!!window.SIPDA_READER_ROUTER,handle:!!oldHandle};
  }
  document.addEventListener('DOMContentLoaded',function(){
    load('sipda-reader-pl.js').then(function(){return load('sipda-reader-me.js');}).then(function(){return load('sipda-reader-router.js');}).then(function(){setTimeout(attachRouter,250);});
  });
})();
