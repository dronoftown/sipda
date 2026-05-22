/* SIPDA v7 · Gemini Gem bridge integrado */
(function(){
  var GEM_URL='https://gemini.google.com/gem/1ZSBFOLRtKOOWgVvL7PbUTkqmEVp7zCN1?usp=sharing';
  var gemWindow=null;

  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function services(){try{if(window.DATA&&Array.isArray(window.DATA.services))return window.DATA.services;}catch(e){}try{return JSON.parse(localStorage.getItem('sipda.v7.history.datasets')||'[]').flatMap(function(x){return ((x.dataset||x).services)||[];});}catch(e){return[];}}

  function buildPrompt(){
    var input=document.getElementById('sipdaAgentInput');
    var question=clean(input&&input.value?input.value:'Analitza les novetats carregades i genera lectura operativa per comandament.');
    var rows=services().slice(0,120).map(function(s,i){return{n:i+1,font:clean(s.sourceType||s.sourceBadge||s.sourceLabel||''),hora:clean(s.time||''),zona:clean(s.zone||s.address||s.displayAddress||''),categoria:clean(s.category||''),prioritat:clean(s.priority||''),titol:clean(s.title||''),resum:clean(s.summary||'').slice(0,500)};});
    return 'SIPDA · CONTEXT OPERATIU PER AL GEM\n\nActua com el Gem SIPDA configurat per intel·ligència policial municipal. Respon en català, amb criteri operatiu, executiu i accionable. Diferencia fets documentats, patrons, predicció i accions preventives.\n\nPREGUNTA DEL COMANDAMENT:\n'+question+'\n\nSERVEIS NORMALITZATS:\n'+JSON.stringify(rows,null,2)+'\n\nTEXT BRUT DISPONIBLE:\n'+clean(window.SIPDA_LAST_PDF_TEXT||'').slice(0,12000);
  }

  function sidePanelGeometry(){
    var w=440;
    var h=screen.availHeight||window.innerHeight||860;
    var screenLeft=screen.availLeft!==undefined?screen.availLeft:0;
    var screenTop=screen.availTop!==undefined?screen.availTop:0;
    var screenWidth=screen.availWidth||window.outerWidth||1440;
    return{w:w,h:h,left:Math.max(0,screenLeft+screenWidth-w),top:screenTop};
  }

  function openControlledGemWindow(){
    var g=sidePanelGeometry();
    var features=['popup=yes','width='+g.w,'height='+g.h,'left='+g.left,'top='+g.top,'menubar=no','toolbar=no','location=no','status=no','scrollbars=yes','resizable=yes'].join(',');
    if(gemWindow&&!gemWindow.closed){try{gemWindow.focus();gemWindow.moveTo(g.left,g.top);gemWindow.resizeTo(g.w,g.h);return;}catch(e){}}
    gemWindow=window.open(GEM_URL,'sipda_gem_sidepanel',features);
    if(!gemWindow)gemWindow=window.open(GEM_URL,'_blank');
    try{if(gemWindow){gemWindow.focus();gemWindow.moveTo(g.left,g.top);gemWindow.resizeTo(g.w,g.h);}}catch(e){}
  }

  async function openGem(){
    try{await navigator.clipboard.writeText(buildPrompt());}catch(e){}
    openControlledGemWindow();
    var status=document.getElementById('sipdaAgentStatus');
    if(status)status.textContent='Context copiat · Enganxa’l al Gem SIPDA';
  }

  function addStyle(){
    if(document.getElementById('sipdaGemTopbarStyle'))return;
    var s=document.createElement('style');
    s.id='sipdaGemTopbarStyle';
    s.textContent='#sipdaGemFloatButton{display:none!important}.sipda-gem-topbtn{height:40px!important;border:1px solid #dc2626!important;background:#dc2626!important;color:#fff!important;border-radius:14px!important;padding:0 14px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-family:Inter,Arial,sans-serif!important;font-size:13px!important;font-weight:850!important;letter-spacing:-.01em!important;cursor:pointer!important;box-shadow:0 8px 18px rgba(220,38,38,.20)!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease!important}.sipda-gem-topbtn:hover{background:#b91c1c!important;border-color:#b91c1c!important;transform:translateY(-1px)!important;box-shadow:0 12px 24px rgba(185,28,28,.25)!important}.sipda-gem-topbtn svg{width:17px!important;height:17px!important;fill:#fff!important;stroke:none!important}@media(max-width:760px){.sipda-gem-topbtn span{display:none!important}.sipda-gem-topbtn{width:42px!important;padding:0!important;border-radius:14px!important}}';
    document.head.appendChild(s);
  }

  function gemIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.25c.45 3.35 1.55 5.75 3.28 7.19 1.72 1.43 3.88 2.28 6.47 2.56-2.59.28-4.75 1.13-6.47 2.56-1.73 1.44-2.83 3.84-3.28 7.19-.45-3.35-1.55-5.75-3.28-7.19C7 13.13 4.84 12.28 2.25 12c2.59-.28 4.75-1.13 6.47-2.56C10.45 8 11.55 5.6 12 2.25Z"/></svg>';
  }

  function mountTopButton(){
    addStyle();
    var old=document.getElementById('sipdaGemFloatButton');
    if(old)old.style.display='none';
    if(document.getElementById('sipdaGemTopButton'))return;
    var anchor=document.getElementById('periodFilter')||document.getElementById('commandSearch')||document.getElementById('openImport');
    var parent=anchor?anchor.parentNode:document.querySelector('.top-actions');
    if(!parent)return;
    var b=document.createElement('button');
    b.id='sipdaGemTopButton';
    b.className='sipda-gem-topbtn';
    b.type='button';
    b.title='Obrir Gem SIPDA';
    b.setAttribute('aria-label','Obrir Gem SIPDA');
    b.innerHTML=gemIcon()+'<span>Agent SIPDA</span>';
    b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openGem();},true);
    if(anchor&&anchor.nextSibling)parent.insertBefore(b,anchor.nextSibling);else parent.appendChild(b);
  }

  function mountFooterButton(){
    if(document.getElementById('sipdaGemBridgeBtn'))return;
    var footer=document.querySelector('.sipda-agent-footer');
    if(!footer)return;
    var b=document.createElement('button');
    b.id='sipdaGemBridgeBtn';
    b.type='button';
    b.textContent='Obrir Gem SIPDA';
    b.style.cssText='border:1px solid #dc2626;background:#dc2626;color:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:850;cursor:pointer;';
    b.addEventListener('click',openGem);
    footer.appendChild(b);
  }

  function tick(){mountTopButton();mountFooterButton();window.SIPDA_GEM_BRIDGE={open:openGem,url:GEM_URL,mode:'topbar-red-gemini-button'};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){tick();setInterval(tick,1000);});else{tick();setInterval(tick,1000);}
})();
