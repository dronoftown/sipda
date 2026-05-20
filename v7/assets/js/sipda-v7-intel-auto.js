/* SIPDA v7 · automatització Intel·ligència SIPDA */
(function(){
  const BUILD='intel-auto-2026-05-20';
  let lastSignature='';
  let timer=null;

  function data(){
    try{return typeof DATA!=='undefined'?DATA:(window.DATA||{});}catch(e){return window.DATA||{};}
  }

  function services(){
    const d=data();
    return Array.isArray(d.services)?d.services:[];
  }

  function signature(){
    const d=data();
    const parts=[
      services().length,
      services().map(s=>[s.id,s.sourceType,s.priority,s.zone,s.time,s.category].join('|')).join('¬'),
      d.source&&d.source.document?d.source.document:'',
      d.source&&d.source.reports?d.source.reports:'',
      document.getElementById('periodFilterLabel')?.textContent||'',
      document.getElementById('kpiTotal')?.textContent||'',
      document.getElementById('overviewTotalServices')?.textContent||''
    ];
    return parts.join('§');
  }

  function run(reason){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      try{
        if(typeof window.render==='function') window.render();
        if(typeof window.drawMap==='function') window.drawMap(false);
        if(window.lucide) window.lucide.createIcons();
        window.dispatchEvent(new CustomEvent('sipda:intel:refreshed',{detail:{reason,services:services().length,build:BUILD}}));
      }catch(err){
        console.warn('[SIPDA Intel Auto] refresh error',reason,err);
      }
    },120);
  }

  function refresh(reason){
    const sig=signature();
    if(reason==='force'||sig!==lastSignature){
      lastSignature=sig;
      run(reason||'data-change');
    }
  }

  function burst(reason){
    [120,450,950,1600,2600].forEach(ms=>setTimeout(()=>refresh(reason),ms));
  }

  function bindButtons(){
    ['applyPanel','addHistory','clearHistory','periodApply','periodCancel','periodClose','openImport','choosePdf','cancelImport','closeImport'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el||el.__sipdaIntelAutoBound)return;
      el.__sipdaIntelAutoBound=true;
      el.addEventListener('click',()=>burst(id),true);
    });
    const input=document.getElementById('pdfInput');
    if(input&&!input.__sipdaIntelAutoBound){
      input.__sipdaIntelAutoBound=true;
      input.addEventListener('change',()=>burst('pdfInput'),true);
    }
  }

  function observeDom(){
    const targets=['importPreview','importStatus','historyStatus','kpiTotal','overviewTotalServices','periodFilterLabel','sourcePredictionGrid','aiFeed','hotZones'];
    const observer=new MutationObserver(()=>refresh('mutation'));
    targets.forEach(id=>{
      const el=document.getElementById(id);
      if(el&&!el.__sipdaIntelObserved){
        el.__sipdaIntelObserved=true;
        observer.observe(el,{childList:true,subtree:true,characterData:true,attributes:true});
      }
    });
  }

  function patchStorage(){
    if(window.__sipdaIntelStoragePatched)return;
    window.__sipdaIntelStoragePatched=true;
    ['setItem','removeItem','clear'].forEach(method=>{
      const original=Storage.prototype[method];
      Storage.prototype[method]=function(){
        const result=original.apply(this,arguments);
        burst('storage-'+method);
        return result;
      };
    });
    window.addEventListener('storage',()=>burst('storage-event'));
  }

  function boot(){
    bindButtons();
    observeDom();
    patchStorage();
    burst('boot');
    setInterval(()=>{
      bindButtons();
      observeDom();
      refresh('heartbeat');
    },1800);
  }

  window.SIPDA_INTEL_AUTO={build:BUILD,refresh:()=>refresh('force'),burst,signature};
  document.addEventListener('DOMContentLoaded',boot);
  if(document.readyState!=='loading') boot();
})();
