export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Mudança crucial: de v1beta para v1
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Organize estas notas de psicanálise: " + notas }] }]
      })
    });

    const data = await res.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const texto = data.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ texto }), { headers: { "Content-Type": "application/json" } });
    } else {
      const erroReal = data.error?.message || "Erro de configuração de modelo";
      return new Response(JSON.stringify({ texto: "Gemini: " + erroReal }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}