(function(){
  const agentUrl = 'https://m365.cloud.microsoft/chat/';

  function addStyle(){
    if(document.getElementById('sipda-ia-demo-style')) return;
    const style = document.createElement('style');
    style.id = 'sipda-ia-demo-style';
    style.textContent = `
      .is-locked .sipda-ia-btn{display:none!important}
      .sipda-ia-btn{position:fixed;right:24px;bottom:24px;z-index:9000;display:inline-flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;background:#0054A6;color:#fff;font-weight:800;font-size:14px;box-shadow:0 18px 40px rgba(0,84,166,.28);cursor:pointer}
      .sipda-ia-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.18)}
      .sipda-ia-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.36);backdrop-filter:blur(6px)}
      .sipda-ia-modal.is-open{display:flex}
      .sipda-ia-card{position:relative;width:min(460px,100%);background:#fff;border-radius:28px;padding:32px;box-shadow:0 32px 80px rgba(15,23,42,.24);border:1px solid #eef2f7;font-family:Inter,system-ui,sans-serif}
      .sipda-ia-close{position:absolute;top:18px;right:18px;width:36px;height:36px;border:0;border-radius:12px;background:#f2f4f7;color:#101828;font-size:24px;line-height:1;cursor:pointer}
      .sipda-ia-icon{width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:#0054A6;color:#fff;font-weight:900;margin-bottom:18px}
      .sipda-ia-card h2{margin:0;font-size:24px;color:#101828;letter-spacing:-.03em}
      .sipda-ia-card p{margin:10px 0 18px;color:#475467;font-size:14px;line-height:1.5}
      .sipda-ia-warning{padding:12px 14px;border-radius:16px;background:#fff7ed;color:#9a3412;font-size:12px;font-weight:700;margin-bottom:20px;line-height:1.4}
      .sipda-ia-help{margin:0 0 18px;padding:12px 14px;border-radius:16px;background:#f8fafc;color:#475467;font-size:12px;line-height:1.45;border:1px solid #eef2f7}
      .sipda-ia-open{width:100%;height:46px;border:0;border-radius:16px;background:#0054A6;color:#fff;font-weight:800;font-size:14px;cursor:pointer}
      @media(max-width:768px){.sipda-ia-btn{right:18px;bottom:82px}.sipda-ia-card{border-radius:24px;padding:28px}}
    `;
    document.head.appendChild(style);
  }

  function init(){
    if(document.getElementById('sipdaIaDemoRoot')) return;
    addStyle();

    const root = document.createElement('div');
    root.id = 'sipdaIaDemoRoot';
    root.innerHTML = `
      <button id="sipdaIaBtn" class="sipda-ia-btn" type="button" aria-label="Obrir SIPDA IA"><span class="sipda-ia-dot"></span>SIPDA IA</button>
      <div id="sipdaIaModal" class="sipda-ia-modal" role="dialog" aria-modal="true" aria-labelledby="sipdaIaTitle">
        <div class="sipda-ia-card">
          <button id="sipdaIaClose" class="sipda-ia-close" type="button" aria-label="Tancar">×</button>
          <div class="sipda-ia-icon">IA</div>
          <h2 id="sipdaIaTitle">SIPDA IA</h2>
          <p>Agent d’intel·ligència operativa policial municipal. Aquesta demo obre Microsoft 365 Copilot.</p>
          <div class="sipda-ia-warning">Versió demo sense autenticació avançada. No utilitzar dades policials reals ni informació sensible.</div>
          <div class="sipda-ia-help">En obrir-se Microsoft 365, selecciona l’agent <strong>SIPDA IA</strong> des del lateral o des d’agents ancorats.</div>
          <button id="sipdaIaOpen" class="sipda-ia-open" type="button">Obrir Microsoft 365 Copilot</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const modal = document.getElementById('sipdaIaModal');
    const openModal = () => { modal.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
    const closeModal = () => { modal.classList.remove('is-open'); document.body.style.overflow = ''; };

    document.getElementById('sipdaIaBtn')?.addEventListener('click', openModal);
    document.getElementById('sipdaIaClose')?.addEventListener('click', closeModal);
    document.getElementById('sipdaIaOpen')?.addEventListener('click', () => window.open(agentUrl, '_blank', 'noopener,noreferrer'));
    modal?.addEventListener('click', (event) => { if(event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => { if(event.key === 'Escape') closeModal(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
