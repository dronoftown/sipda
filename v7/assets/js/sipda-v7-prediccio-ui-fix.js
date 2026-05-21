/* SIPDA v7 · ajuste visual prediccio 48H */
(function(){
  const BUILD='sipda-v7-prediccio-ui-fix-2026-05-21';
  function style(){
    if(document.getElementById('sipdaPred48UiFixStyle')) return;
    const css=document.createElement('style');
    css.id='sipdaPred48UiFixStyle';
    css.textContent=`
      #sourcePredictionGrid{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;gap:0!important}
      .sipda-intel-matrix-column{display:none!important}
      .sipda-intel-main-grid{grid-template-columns:1fr!important}
      .sipda-prediction-48-btn,
      #sipdaPrediction48Button{
        position:relative!important;
        background:#111!important;
        border-color:#111!important;
        color:#fff!important;
        animation:sipdaPred48Pulse 1.65s ease-in-out infinite!important;
        box-shadow:0 0 0 rgba(0,84,166,0)!important;
      }
      .sipda-prediction-48-btn::after,
      #sipdaPrediction48Button::after{
        content:"";
        position:absolute;
        inset:-3px;
        border:1px solid rgba(0,84,166,.45);
        pointer-events:none;
        opacity:.65;
        animation:sipdaPred48Ring 1.65s ease-in-out infinite;
      }
      @keyframes sipdaPred48Pulse{
        0%,100%{background:#111;border-color:#111;box-shadow:0 0 0 rgba(0,84,166,0)}
        50%{background:#0054A6;border-color:#0054A6;box-shadow:0 0 0 5px rgba(0,84,166,.16)}
      }
      @keyframes sipdaPred48Ring{
        0%,100%{opacity:.25;transform:scale(.98)}
        50%{opacity:.95;transform:scale(1.04)}
      }
      @media(max-width:1180px){.top-actions #sipdaPrediction48Button{grid-column:auto!important}}
    `;
    document.head.appendChild(css);
  }
  function removeInitialPredictionCards(){
    const grid=document.getElementById('sourcePredictionGrid');
    if(grid && grid.innerHTML) grid.innerHTML='';
  }
  function ensureButtonVisible(){
    const button=document.getElementById('sipdaPrediction48Button');
    const clear=document.getElementById('clearHistory');
    if(button && clear && clear.parentElement && button.nextElementSibling!==clear){
      clear.parentElement.insertBefore(button,clear);
    }
  }
  function tick(){style();removeInitialPredictionCards();ensureButtonVisible();window.SIPDA_PREDICCIO_UI_FIX={build:BUILD,active:true};}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{tick();setInterval(tick,900);});
  else {tick();setInterval(tick,900);}
})();
