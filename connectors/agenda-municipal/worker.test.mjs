// node --test connectors/agenda-municipal/worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('./worker.js',import.meta.url),'utf8');
const worker = (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const realFetch = globalThis.fetch;
const jsonld = (items) => '<!doctype html><html><script src="/js/app.js"></script><script type="application/ld+json">'+JSON.stringify(items)+'</script></html>';
async function invoke(path, html, status=200) {
  globalThis.fetch = async()=>new Response(html,{status,headers:{'content-type':'text/html'}});
  try {const res=await worker.fetch(new Request('https://sipda.local'+path));return {status:res.status,body:await res.json()};}
  finally {globalThis.fetch=realFetch}
}
test('reports schema uncertainty rather than claiming no municipal events', async()=>{
 const r=await invoke('/events?hours=72','<html><script src="/app.js"></script></html>');
 assert.equal(r.status,503); assert.equal(r.body.status,'extraction_unverified');
});
test('extracts, deduplicates and filters 72h without persistence',async()=>{
 const start=new Date(Date.now()+3600_000).toISOString();
 const out=new Date(Date.now()+10*86400_000).toISOString();
 const items=[{'@type':'Event',name:'Concert',startDate:start,location:{name:'Plaça Major'},url:'https://agenda.platjadaro.com/ca/acte'},
 {'@type':'Event',name:'Concert',startDate:start,location:{name:'Plaça Major'}},
 {'@type':'Event',name:'Futur',startDate:out}];
 const r=await invoke('/events?hours=72',jsonld(items));
 assert.equal(r.status,200);assert.equal(r.body.events.length,1);assert.equal(r.body.events[0].title,'Concert');
 assert.equal(r.body.storage,false);
});
test('diagnostic identifies same-origin script paths only',async()=>{
 const r=await invoke('/diagnostic',jsonld([])+'<script src="https://evil.example/x.js"></script>');
 assert.equal(r.status,200);assert.ok(r.body.inspection.script_paths.includes('/js/app.js'));
 assert.ok(!r.body.inspection.script_paths.includes('/x.js'));
});
test('rejects unsupported windows and upstream failures',async()=>{
 assert.equal((await invoke('/events?hours=1000','')).status,400);
 assert.equal((await invoke('/events','error',503)).status,502);
});
