export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;

  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    
    // Mudamos para a versão estável 'v1' e o modelo 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `Aja como um assistente acadêmico editorial para psicanalistas. 
            Sua tarefa é organizar notas de estudo em uma estrutura narrativa para uma aula ou palestra, sugerindo conexões teóricas. 
            Notas: ${notas}` 
          }] 
        }]
      })
    });

    const data = await res.json();

    // Se o Google ainda der erro, aqui pegaremos a mensagem nova
    if (data.error) {
      return new Response(JSON.stringify({ error: "Erro Google: " + data.error.message }), { status: 500 });
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração";

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}