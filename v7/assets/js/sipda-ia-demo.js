/* SIPDA v7 · carregador del mòdul IA natiu */
(function(){
  const BUILD='sipda-v7-ia-loader-2026-05-21';
  function loadNativePrediction(){
    if(document.getElementById('sipda-v7-prediccio-native-loader')) return;
    const script=document.createElement('script');
    script.id='sipda-v7-prediccio-native-loader';
    script.src='./assets/js/sipda-v7-prediccio-native.js?v='+(window.SIPDA_BUILD||Date.now());
    script.defer=true;
    document.head.appendChild(script);
    window.SIPDA_IA_LOADER={build:BUILD,loaded:true,script:script.src};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadNativePrediction);
  else loadNativePrediction();
})();
