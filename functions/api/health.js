export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, service: "sipda-api" }), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
