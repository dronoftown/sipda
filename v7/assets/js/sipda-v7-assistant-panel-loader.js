/* SIPDA v7 · assistant panel loader */
(function(){
  function load(){
    if(document.getElementById('sipda-assistant-panel-runtime')) return;
    var s=document.createElement('script');
    s.id='sipda-assistant-panel-runtime';
    s.src='./assets/js/sipda-v7-gem-panel.js?v='+(window.SIPDA_BUILD||Date.now());
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load);
  else load();
})();
