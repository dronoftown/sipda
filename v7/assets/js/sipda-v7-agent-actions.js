/* SIPDA v7 · Agent SIPDA icon polish */
(function(){
  const BUILD='sipda-agent-icons-chatgpt-style-2026-05-22';

  function apply(){
    const attach=document.getElementById('sipdaAgentAttach');
    const send=document.getElementById('sipdaAgentSend');

    if(attach && attach.dataset.sipdaIcon!=='plus'){
      attach.innerHTML='<i data-lucide="plus"></i>';
      attach.dataset.sipdaIcon='plus';
      attach.title='Adjuntar fitxer';
      attach.setAttribute('aria-label','Adjuntar fitxer');
    }

    if(send && send.dataset.sipdaIcon!=='arrow-up'){
      send.innerHTML='<i data-lucide="arrow-up"></i>';
      send.dataset.sipdaIcon='arrow-up';
      send.title='Enviar';
      send.setAttribute('aria-label','Enviar');
    }

    if(window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    window.SIPDA_AGENT_ACTIONS={build:BUILD,active:true,icons:'plus-arrow-up'};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){apply();setInterval(apply,800);});
  else {apply();setInterval(apply,800);}
})();
