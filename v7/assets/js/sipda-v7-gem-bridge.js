/* SIPDA v7 · Gemini Gem bridge */
(function(){
  var GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function services(){try{if(window.DATA&&Array.isArray(window.DATA.services))return window.DATA.services;}catch(e){}try{return JSON.parse(localStorage.getItem('sipda.v7.history.datasets')||'[]').flatMap(function(x){return ((x.dataset||x).services)||[];});}catch(e){return[];}}
  function buildPrompt(){
    var input=document.getElementById('sipdaAgentInput');
    var question=clean(input&&input.value?input.value:'Analitza les novetats carregades i genera lectura operativa per comandament.');
    var rows=services().slice(0,120).map(function(s,i){return {
      n:i+1,
      font:clean(s.sourceType||s.sourceBadge||s.sourceLabel||''),
      hora:clean(s.time||''),
      zona:clean(s.zone||s.address||s.displayAddress||''),
      categoria:clean(s.category||''),
      prioritat:clean(s.priority||''),
      titol:clean(s.title||''),
      resum:clean(s.summary||'').slice(0,500)
    };});
    return 'SIPDA · CONTEXT OPERATIU PER AL GEM\n\n'+
      'Actua com el Gem SIPDA configurat per intel·ligència policial municipal. Respon en català, amb criteri operatiu, executiu i accionable. Diferencia fets documentats, patrons, predicció i accions preventives.\n\n'+
      'PREGUNTA DEL COMANDAMENT:\n'+question+'\n\n'+
      'SERVEIS NORMALITZATS:\n'+JSON.stringify(rows,null,2)+'\n\n'+
      'TEXT BRUT DISPONIBLE:\n'+clean(window.SIPDA_LAST_PDF_TEXT||'').slice(0,12000);
  }
  function openControlledGemWindow(){
    var w=Math.min(1120,Math.max(920,screen.availWidth-120));
    var h=Math.min(860,Math.max(720,screen.availHeight-90));
    var left=Math.max(0,Math.round((screen.availWidth-w)/2));
    var top=Math.max(0,Math.round((screen.availHeight-h)/2));
    var features=[
      'popup=yes',
      'width='+w,
      'height='+h,
      'left='+left,
      'top='+top,
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=yes',
      'resizable=yes'
    ].join(',');
    var win=window.open(GEM_URL,'sipda_gem_window',features);
    if(!win)win=window.open(GEM_URL,'_blank');
    try{if(win)win.focus();}catch(e){}
  }
  async function openGem(){
    var prompt=buildPrompt();
    try{await navigator.clipboard.writeText(prompt);}catch(e){}
    openControlledGemWindow();
    var status=document.getElementById('sipdaAgentStatus');
    if(status)status.textContent='Context copiat · Enganxa’l al Gem SIPDA';
  }
  function mount(){
    if(document.getElementById('sipdaGemBridgeBtn'))return;
    var footer=document.querySelector('.sipda-agent-footer');
    if(!footer)return;
    var b=document.createElement('button');
    b.id='sipdaGemBridgeBtn';
    b.type='button';
    b.textContent='Obrir Gem SIPDA';
    b.style.cssText='border:1px solid #101828;background:#101828;color:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:850;cursor:pointer;';
    b.addEventListener('click',openGem);
    footer.appendChild(b);
    window.SIPDA_GEM_BRIDGE={open:openGem,url:GEM_URL,mode:'controlled-popup'};
  }
  function tick(){mount();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){tick();setInterval(tick,800);});else{tick();setInterval(tick,800);}
})();
