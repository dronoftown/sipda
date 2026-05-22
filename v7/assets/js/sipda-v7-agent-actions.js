(function(){
function css(){if(document.getElementById('sipdaPredCompactCss'))return;var l=document.createElement('link');l.id='sipdaPredCompactCss';l.rel='stylesheet';l.href='./assets/css/sipda-pred-compact.css?v='+(window.SIPDA_BUILD||Date.now());document.head.appendChild(l)}
function run(){css();window.SIPDA_AGENT_ACTIONS={active:true,predCompact:true}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();