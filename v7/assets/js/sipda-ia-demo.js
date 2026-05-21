/* SIPDA v7 · carregador del mòdul IA natiu */
(function(){
  const BUILD='sipda-v7-ia-loader-live-2026-05-21';
  function loadLivePrediction(){
    if(document.getElementById('sipda-v7-prediccio-live-loader')) return;
    const script=document.createElement('script');
    script.id='sipda-v7-prediccio-live-loader';
    script.src='./assets/js/sipda-v7-prediccio-live.js?v='+(window.SIPDA_BUILD||Date.now());
    document.head.appendChild(script);
    window.SIPDA_IA_LOADER={build:BUILD,loaded:true,script:script.src};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadLivePrediction);
  else loadLivePrediction();
})();
