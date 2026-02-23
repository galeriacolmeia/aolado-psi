// Update: 23-02-2026 - Versão 1.0 Pro.

export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;

  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Usando o Gemini 1.0 Pro, que tem a maior compatibilidade de rotas
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Aja como um assistente acadêmico para psicanalistas. Transforme estas notas em uma estrutura para aula ou palestra: ${notas}` 
          }] 
        }]
      })
    });

    const data = await res.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: "Erro Google: " + data.error.message }), { status: 500 });
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração";

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro Script: " + e.message }), { status: 500 });
  }
}