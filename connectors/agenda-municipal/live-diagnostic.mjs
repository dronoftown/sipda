// Diagnóstico de conectividad bajo demanda. No guarda HTML ni actividades.
const target = 'https://agenda.platjadaro.com/ca/proxims_30_dies/tots/tothom/tots_espais/tots_nuclis/';
const abort = AbortSignal.timeout(15000);
try {
  const response = await fetch(target, {signal:abort, headers:{'accept':'text/html','user-agent':'SIPDA-CON-001-Diagnostic/0.1 (public municipal agenda; no storage)'}});
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
     .map(m=>{try{return new URL(m[1],target)}catch{return null}})
     .filter(u=>u && u.origin==='https://agenda.platjadaro.com')
     .map(u=>u.pathname).slice(0,35);
  const possibleApiPaths = [...new Set([...html.matchAll(/(?:["'])(\/api\/[^"'\s<>]+)(?:["'])/gi)].map(m=>m[1]))].slice(0,25);
  const hasJsonLd = /application\/ld\+json/i.test(html);
  const hasActivityLink = /\/activitats\/|\/actividades\//i.test(html);
  console.log(JSON.stringify({check:'live_source',http_status:response.status,final_host:new URL(response.url).host,bytes:html.length,
    script_paths:[...new Set(scripts)],potential_api_paths:possibleApiPaths,jsonld_present:hasJsonLd,activity_links_present:hasActivityLink,
    event_data_saved:false},null,2));
  if(response.status===403) {
    console.log('STATUS: ACCESS_DENIED_BY_SOURCE — request API or approved machine-to-machine access; no bypass attempts.');
  } else if(!response.ok) {
    console.log('STATUS: SOURCE_HTTP_ERROR');
  } else {
    console.log('STATUS: SOURCE_REACHABLE');
  }
} catch (error) {console.error('Live source diagnostic failed: '+error.message); process.exitCode=1}
