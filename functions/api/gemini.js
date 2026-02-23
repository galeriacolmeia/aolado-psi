export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Usando o nome EXATO que apareceu na sua lista de varredura
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: "Atue como um redator acadêmico. Transforme estas notas em um texto estruturado, mantendo o rigor dos conceitos: " + notas 
          }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await res.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (texto) {
      return new Response(JSON.stringify({ texto }), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ texto: "O modelo recusou. Erro: " + JSON.stringify(data) }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}