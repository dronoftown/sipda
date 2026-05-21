const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

  try {
    const body = await request.json();
    const informePoliciaLocal = body.informePoliciaLocal || "";
    const informeMossos = body.informeMossos || "";

    if (!informePoliciaLocal && !informeMossos) {
      return reply({ error: "No reports received" }, 400);
    }

    return reply({
      motor: "SIPDA demo endpoint",
      model: "pending-gemini-secret",
      generatA: new Date().toISOString(),
      resumExecutiu: "Endpoint intern preparat. Falta activar la crida segura a Gemini des de Cloudflare.",
      prediccio48h: [
        {
          risc: "Validacio tecnica",
          zona: "Sistema SIPDA",
          franja: "Prova immediata",
          prioritat: "Mitjana",
          probabilitat: "Alta",
          impacte: "Permet validar que Cloudflare Pages Functions respon correctament",
          baseDocumental: "S'han rebut informes al cos de la peticio",
          prediccio: "El circuit frontend endpoint resposta JSON queda validat",
          accioPreventiva: "Configurar GEMINI_API_KEY com a secret i substituir aquest stub per la crida a Gemini"
        }
      ],
      patronsDetectats: ["Endpoint HTTP actiu", "Resposta JSON valida", "CORS habilitat"],
      recomanacioComandament: "Validar /api/health i /api/prediccio48h abans d'activar Gemini."
    });
  } catch (error) {
    return reply({ error: "Prediction endpoint failed", detail: error.message }, 500);
  }
}
