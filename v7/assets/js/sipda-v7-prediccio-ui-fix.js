/* SIPDA v7 · ajuste visual prediccio 48H */
(function(){
  const BUILD='sipda-v7-prediccio-ui-fix-strong-2026-05-21';
  function style(){
    let css=document.getElementById('sipdaPred48UiFixStyle');
    if(!css){
      css=document.createElement('style');
      css.id='sipdaPred48UiFixStyle';
      document.head.appendChild(css);
    }
    css.textContent=`
      #sourcePredictionGrid{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;gap:0!important}
      .sipda-intel-matrix-column{display:none!important}
      .sipda-intel-main-grid{grid-template-columns:1fr!important}

      .sipda-prediction-48-btn,
      #sipdaPrediction48Button{
        position:relative!important;
        isolation:isolate!important;
        min-width:168px!important;
        height:43px!important;
        padding:0 18px!important;
        background:#0054A6!important;
        border:2px solid #0054A6!important;
        color:#fff!important;
        font-weight:950!important;
        letter-spacing:.02em!important;
        text-transform:uppercase!important;
        transform-origin:center!important;
        animation:sipdaPred48MegaPulse 1.05s ease-in-out infinite!important;
        box-shadow:0 0 0 0 rgba(0,84,166,.75),0 0 28px rgba(0,84,166,.55)!important;
      }
      .sipda-prediction-48-btn svg,
      #sipdaPrediction48Button svg{
        width:18px!important;
        height:18px!important;
        animation:sipdaPred48IconShake 1.05s ease-in-out infinite!important;
      }
      .sipda-prediction-48-btn::before,
      #sipdaPrediction48Button::before{
        content:"";
        position:absolute;
        inset:-8px;
        z-index:-1;
        background:rgba(0,84,166,.28);
        border:2px solid rgba(0,84,166,.75);
        opacity:.9;
        animation:sipdaPred48OuterHalo 1.05s ease-in-out infinite!important;
      }
      .sipda-prediction-48-btn::after,
      #sipdaPrediction48Button::after{
        content:"48H";
        position:absolute;
        top:-10px;
        right:-10px;
        min-width:34px;
        height:22px;
        padding:0 7px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#ef4444;
        color:#fff;
        border:2px solid #fff;
        font-size:10px;
        font-weight:950;
        line-height:1;
        box-shadow:0 8px 18px rgba(239,68,68,.38);
        animation:sipdaPred48Badge 1.05s ease-in-out infinite!important;
      }
      @keyframes sipdaPred48MegaPulse{
        0%,100%{
          background:#050505;
          border-color:#050505;
          color:#fff;
          transform:scale(1);
          box-shadow:0 0 0 0 rgba(0,84,166,.0),0 8px 18px rgba(0,0,0,.18);
        }
        48%,55%{
          background:#0054A6;
          border-color:#38bdf8;
          color:#fff;
          transform:scale(1.075);
          box-shadow:0 0 0 9px rgba(0,84,166,.24),0 0 36px rgba(0,84,166,.95),0 0 54px rgba(56,189,248,.46);
        }
      }
      @keyframes sipdaPred48OuterHalo{
        0%,100%{opacity:.25;transform:scale(.94)}
        50%{opacity:1;transform:scale(1.14)}
      }
      @keyframes sipdaPred48Badge{
        0%,100%{transform:scale(1);background:#ef4444}
        50%{transform:scale(1.18);background:#f97316}
      }
      @keyframes sipdaPred48IconShake{
        0%,100%{transform:rotate(0deg) scale(1)}
        25%{transform:rotate(-8deg) scale(1.08)}
        50%{transform:rotate(8deg) scale(1.15)}
        75%{transform:rotate(-5deg) scale(1.08)}
      }
      @media(max-width:1180px){.top-actions #sipdaPrediction48Button{grid-column:auto!important;min-width:100%!important}}
    `;
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
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{tick();setInterval(tick,700);});
  else {tick();setInterval(tick,700);}
})();
