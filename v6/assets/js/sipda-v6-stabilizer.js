/* SIPDA v6 · source rendering stabilizer
   Non-invasive layer: keeps one shared map, cleans duplicated source blocks and ensures source metadata is coherent. */
(function(){
  function normalizeText(value){
    return String(value||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function inferSourceType(item, dataset){
    var raw = normalizeText([
      item && item.sourceType,
      item && item.sourceBadge,
      item && item.sourceLabel,
      item && item.sourceOrigin,
      item && item.origin,
      dataset && dataset.source && dataset.source.sourceType,
      dataset && dataset.source && dataset.source.sourceLabel,
      dataset && dataset.source && dataset.source.origin,
      dataset && dataset.source && dataset.source.document
    ].filter(Boolean).join(' '));

    if(/mossos|usc|pg\s*-?\s*me|policia de la generalitat|cos de mossos|sant feliu de guixols/.test(raw)) return 'MOSSOS';
    if(/policia local|guardia urbana|secretariapolicia|ajuntament de castell|ajuntament de platja/.test(raw) || raw === 'pl') return 'PL';
    return (item && item.sourceType) || (dataset && dataset.source && dataset.source.sourceType) || 'ALTRES';
  }

  function sourceLabel(type){
    if(type === 'PL') return 'Policia Local';
    if(type === 'MOSSOS') return 'Mossos d’Esquadra';
    return 'Altres';
  }

  function hydrateSourceMetadata(data){
    if(!data) return data;
    ['hotspots','timeline'].forEach(function(key){
      data[key] = (data[key]||[]).map(function(item){
        var type = inferSourceType(item, data);
        return Object.assign({}, item, {
          sourceType:type,
          sourceLabel:item.sourceLabel || sourceLabel(type),
          sourceBadge:item.sourceBadge || (type === 'PL' ? 'PL' : type === 'MOSSOS' ? 'ME' : '--')
        });
      });
    });
    data.sourceStats = (data.hotspots||[]).reduce(function(acc,item){
      acc[item.sourceType || 'ALTRES'] = (acc[item.sourceType || 'ALTRES'] || 0) + 1;
      return acc;
    },{});
    return data;
  }

  function dedupeAiSourceBlocks(){
    var feed = document.querySelector('.ai-feed');
    if(!feed) return;
    var blocks = Array.from(feed.querySelectorAll('.feed-item')).filter(function(item){
      return /Origen dels informes/i.test(item.textContent || '');
    });
    blocks.forEach(function(block,index){
      if(index > 0) block.remove();
    });
    if(blocks[0]) blocks[0].setAttribute('data-source-summary','1');
  }

  function stabilize(data){
    hydrateSourceMetadata(data || window.SIPDA_OPERATIONAL_DATA);
    window.setTimeout(dedupeAiSourceBlocks, 120);
  }

  window.addEventListener('sipda:data-updated', function(event){
    if(event.detail) hydrateSourceMetadata(event.detail);
    stabilize(event.detail);
  }, true);

  document.addEventListener('DOMContentLoaded', function(){
    stabilize(window.SIPDA_OPERATIONAL_DATA);
    window.setTimeout(function(){ stabilize(window.SIPDA_OPERATIONAL_DATA); }, 1200);
  });

  window.SIPDA_V6_STABILIZER = { hydrateSourceMetadata: hydrateSourceMetadata, inferSourceType: inferSourceType };
})();
