/* SIPDA v7 · carregador del modul IA natiu */
(function(){
  const BUILD='sipda-v7-ia-loader-assistant-panel-2026-05-22';
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
    loadScriptOnce('sipda-v7-endpoint-bridge-loader','./assets/js/sipda-v7-prediccio-endpoint-bridge.js');
    loadScriptOnce('sipda-v7-assistant-panel-loader','./assets/js/sipda-v7-assistant-panel-loader.js');
    window.SIPDA_IA_LOADER={build:BUILD,loaded:true,endpointBridge:true,assistantPanel:true};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadLivePrediction);
  else loadLivePrediction();
})();