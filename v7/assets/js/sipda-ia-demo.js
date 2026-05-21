/* SIPDA v7 · carregador del mòdul IA natiu */
(function(){
  const BUILD='sipda-v7-ia-loader-live-ui-fix-2026-05-21';
  function loadScriptOnce(id,src){
    if(document.getElementById(id)) return;
    const script=document.createElement('script');
    script.id=id;
    script.src=src+'?v='+(window.SIPDA_BUILD||Date.now());
    document.head.appendChild(script);
  }
  function loadLivePrediction(){
    loadScriptOnce('sipda-v7-prediccio-live-loader','./assets/js/sipda-v7-prediccio-live.js');
    loadScriptOnce('sipda-v7-prediccio-ui-fix-loader','./assets/js/sipda-v7-prediccio-ui-fix.js');
    window.SIPDA_IA_LOADER={build:BUILD,loaded:true};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadLivePrediction);
  else loadLivePrediction();
})();
