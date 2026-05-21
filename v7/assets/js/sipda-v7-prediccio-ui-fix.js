/* SIPDA v7 · ajuste visual prediccio 48H */
(function(){
  const BUILD='sipda-v7-prediccio-ui-clean-no-intro-card-2026-05-22';
  let iconRefreshLock=false;

  function style(){
    let css=document.getElementById('sipdaPred48UiFixStyle');
    if(!css){
      css=document.createElement('style');
      css.id='sipdaPred48UiFixStyle';
      document.head.appendChild(css);
    }
    css.textContent=`
      #prediccio > .section-title{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important}
      #ia.ai-panel{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important}
      #prediccio.prediction-block{margin-top:0!important;padding-top:0!important}
      #sourcePredictionGrid{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;gap:0!important}
      .sipda-intel-matrix-column{display:none!important}
      .sipda-intel-main-grid{grid-template-columns:1fr!important}
      .sipda-intel-side{display:grid!important;grid-template-columns:1fr!important;gap:14px!important}

      .sipda-prediction-48-btn,
      #sipdaPrediction48Button{
        position:relative!important;
        isolation:isolate!important;
        min-width:166px!important;
        height:42px!important;
        padding:0 16px!important;
        border-radius:14px!important;
        background:#101828!important;
        border:1px solid #101828!important;
        color:#fff!important;
        font-weight:850!important;
        letter-spacing:.005em!important;
        text-transform:none!important;
        transform:none!important;
        animation:none!important;
        box-shadow:0 8px 18px rgba(16,24,40,.16)!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        gap:9px!important;
        overflow:hidden!important;
        transition:background-color .22s ease,border-color .22s ease,box-shadow .22s ease,transform .18s ease!important;
      }
      .sipda-prediction-48-btn:hover,
      #sipdaPrediction48Button:hover{
        transform:translateY(-1px)!important;
        box-shadow:0 12px 24px rgba(16,24,40,.18)!important;
      }
      .sipda-prediction-48-btn svg,
      #sipdaPrediction48Button svg{
        width:17px!important;
        height:17px!important;
        stroke-width:2.45!important;
        animation:none!important;
        transform-origin:center!important;
      }
      .sipda-prediction-48-btn::before,
      .sipda-prediction-48-btn::after,
      #sipdaPrediction48Button::before,
      #sipdaPrediction48Button::after{
        content:none!important;
        display:none!important;
        animation:none!important;
      }
      #sipdaPrediction48Button.is-analysing,
      .sipda-prediction-48-btn.is-analysing{
        background:#0054A6!important;
        border-color:#0054A6!important;
        color:#fff!important;
        box-shadow:0 14px 34px rgba(0,84,166,.28)!important;
      }
      #sipdaPrediction48Button.is-analysing svg,
      .sipda-prediction-48-btn.is-analysing svg{
        animation:sipdaPred48IconDrift 1.05s ease-in-out infinite!important;
      }
      #sipdaPrediction48Button.is-analysing span,
      .sipda-prediction-48-btn.is-analysing span{
        letter-spacing:.01em!important;
      }
      @keyframes sipdaPred48IconDrift{
        0%,100%{transform:translateY(0) rotate(0deg) scale(1)}
        35%{transform:translateY(-1px) rotate(-10deg) scale(1.05)}
        70%{transform:translateY(1px) rotate(10deg) scale(1.05)}
      }
      @media(max-width:1180px){.top-actions #sipdaPrediction48Button{grid-column:auto!important;min-width:100%!important}}
    `;
  }

  function removeInitialPredictionCards(){
    const grid=document.getElementById('sourcePredictionGrid');
    if(grid && grid.innerHTML) grid.innerHTML='';
    const ai=document.getElementById('ia');
    if(ai) ai.setAttribute('aria-hidden','true');
  }

  function ensureButtonVisible(){
    const button=document.getElementById('sipdaPrediction48Button');
    const clear=document.getElementById('clearHistory');
    if(button && clear && clear.parentElement && button.nextElementSibling!==clear){
      clear.parentElement.insertBefore(button,clear);
    }
  }

  function setButtonState(){
    const button=document.getElementById('sipdaPrediction48Button');
    if(!button) return;
    const modal=document.getElementById('sipdaPrediction48Modal');
    const analysing=Boolean(modal && !modal.hidden && document.getElementById('sipdaPredStep'));
    const current=button.classList.contains('is-analysing');
    if(analysing===current) return;

    button.classList.toggle('is-analysing',analysing);
    button.innerHTML=analysing?'<i data-lucide="radar"></i><span>Analitzant...</span>':'<i data-lucide="radar"></i><span>Predicció 48H</span>';

    if(window.lucide?.createIcons && !iconRefreshLock){
      iconRefreshLock=true;
      requestAnimationFrame(()=>{window.lucide.createIcons();iconRefreshLock=false;});
    }
  }

  function tick(){
    style();
    removeInitialPredictionCards();
    ensureButtonVisible();
    setButtonState();
    window.SIPDA_PREDICCIO_UI_FIX={build:BUILD,active:true,introCardHidden:true};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{tick();setInterval(tick,450);});
  else {tick();setInterval(tick,450);}
})();
