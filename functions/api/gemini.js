export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;

  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Usando 'gemini-1.5-flash-latest' que é o codinome mais aceito na v1
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Contexto: Assistente para psicanalistas. 
            Objetivo: Transformar notas em roteiro de aula/palestra acadêmica. 
            Notas: ${notas}` 
          }] 
        }]
      })
    });

    const data = await res.json();

    if (data.error) {
      return new Response(JSON.stringify({ error: "Erro Detalhado: " + data.error.message }), { status: 500 });
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração";

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro Script: " + e.message }), { status: 500 });
  }
}