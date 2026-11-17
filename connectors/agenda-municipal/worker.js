// SIPDA-CON-001 — consulta efímera, sin bases de datos ni almacenamiento.
const SOURCE = 'https://agenda.platjadaro.com';
const FEED = SOURCE+'/ca/proxims_30_dies/tots/tothom/tots_espais/tots_nuclis/';
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'};
const reply = (data, status=200) => new Response(JSON.stringify(data), {status,headers});
const clean = value => String(value ?? '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
function extract(tree,found=[]) {
  if (!tree || typeof tree !== 'object') return found;
  if (Array.isArray(tree)) {tree.forEach(x=>extract(x,found));return found;}
  const types=[].concat(tree['@type'] || []);
  if(types.some(t => /Event$/.test(String(t))) && tree.name && tree.startDate) {
    const place=Array.isArray(tree.location) ? tree.location[0] : tree.location;
    found.push({title:clean(tree.name),start:tree.startDate,end:tree.endDate||null,
      venue:clean(place?.name || (typeof place==='string'?place:''))||null,
      url:(()=>{try{const u=new URL(String(tree.url||''),SOURCE);return u.origin===SOURCE?u.href:null}catch{return null}})(), source:SOURCE});
  }
  for(const value of Object.values(tree)) if(value && typeof value==='object') extract(value,found);
  return found;
}
function inspectHtml(html) {
  const scripts = [...html.matchAll(/<script\\b[^>]*\\bsrc\\s*=\\s*["']([^"']+)["']/gi)]
    .map(m => {try {const u=new URL(m[1],SOURCE); return u.origin===SOURCE ? u.pathname : null} catch{return null}})
    .filter(Boolean);
  const activityLinks = [...html.matchAll(/<a\\b[^>]*href\\s*=\\s*["']([^"']+)["']/gi)]
    .map(m => {try {const u=new URL(m[1],SOURCE); return u.origin===SOURCE && /\\/(activitats|actividades|activities)\\//i.test(u.pathname) ? u.pathname : null} catch{return null}})
    .filter(Boolean);
  const embeddedJson = [...html.matchAll(/<script\\b[^>]*type\\s*=\\s*["']application\\/json["'][^>]*>/gi)].length;
  const markers = {
    jquery: /jquery(?:\\.min)?\\.js/i.test(html),
    axios: /axios(?:\\.min)?\\.js/i.test(html),
    fetchCalls: /\\bfetch\\s*\\(/.test(html),
    ajaxCalls: /\\$\\.ajax\\s*\\(|\\$\\.get\\s*\\(/.test(html)
  };
  return {script_paths:[...new Set(scripts)].slice(0,30),activity_page_paths:[...new Set(activityLinks)].slice(0,15),embedded_json_scripts:embeddedJson,markers};
}
function fromHtml(html) {
  const events=[];
  for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)){
    try {extract(JSON.parse(m[1].replace(/&quot;/g,'"')),events)}catch{}
  }
  return [...new Map(events.map(x=>[x.title+'|'+x.start+'|'+x.venue,x])).values()];
}
export default {async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/health') return reply({connector:'SIPDA-CON-001',status:'ready',storage:false});
  if(!['/events','/diagnostic'].includes(url.pathname)) return reply({routes:['/health','/diagnostic','/events?hours=72']},404);
  const hours=Number(url.searchParams.get('hours')||72);
  if(!Number.isInteger(hours)||hours<1||hours>720) return reply({error:'hours must be integer 1–720'},400);
  let response,html;
  try {
    response=await fetch(FEED,{headers:{accept:'text/html'},redirect:'follow',cf:{cacheTtl:0,cacheEverything:false}});
    if(response.url && new URL(response.url).origin!==SOURCE) return reply({status:'unexpected_redirect'},502);
    if(!response.ok)return reply({status:'source_error',http_status:response.status,source:FEED},502);
    if(!(response.headers.get('content-type')||'').includes('text/html'))return reply({status:'unsupported_source_type'},502);
    html=await response.text();
    if(html.length>3000000)return reply({status:'source_too_large'},502);
  } catch{return reply({status:'source_unavailable',source:FEED},502);}
  const events=fromHtml(html), checked_at=new Date().toISOString();
  if(url.pathname==='/diagnostic')return reply({connector:'SIPDA-CON-001',checked_at,source:FEED,http_status:response.status,html_bytes:html.length,jsonld_events:events.length,inspection:inspectHtml(html),client_side_rendering_possible:events.length===0,storage:false});
  if(events.length===0)return reply({connector:'SIPDA-CON-001',status:'extraction_unverified',message:'No structured events in HTML; site may use dynamic API. Not evidence of zero events.',events:[],source:FEED,checked_at,storage:false},503);
  const now=Date.now();
  return reply({connector:'SIPDA-CON-001',status:'ok',source:FEED,checked_at,window_hours:hours,storage:false,events:events.filter(e=>{
    const start=Date.parse(e.start),end=e.end?Date.parse(e.end):NaN;
    return Number.isFinite(start)&&start<now+hours*3600000&&(Number.isFinite(end)?end>=now:start>=now);
  })});
}};