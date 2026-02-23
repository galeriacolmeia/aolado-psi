export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Usando o sufixo -latest que resolve o erro de "not found"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Atue como assistente acadêmico. Estruture estas notas: " + notas }] }]
      })
    });

    const data = await res.json();

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const texto = data.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ texto }), { headers: { "Content-Type": "application/json" } });
    } else {
      // Se der erro, vamos ver o JSON bruto para não sobrar dúvida
      return new Response(JSON.stringify({ texto: "Resposta do Google: " + JSON.stringify(data) }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}