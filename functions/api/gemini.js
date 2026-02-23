export async function onRequest(context) {
  const GEMINI_KEY = context.env.GEMINI_API_KEY;

  // Se a chave não chegar aqui, o erro 500 para de ser genérico
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "ERRO_CHAVE_NAO_CONFIGURADA" }), { status: 500 });
  }

  try {
    const { notas } = await context.request.json();
    
    // URL do modelo Flash 1.5 (mais estável para rotas de função)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `Contexto: Escrita de aula/conferencia para psicanalistas. 
            Tarefa: Transforme estas notas em uma estrutura acadêmica com conexões teóricas. 
            Notas: ${notas}` 
          }]
        }]
      })
    });

    const data = await response.json();

    // Se o Google reclamar da chave ou de qualquer outra coisa
    if (data.error) {
      return new Response(JSON.stringify({ error: "Google_API_Error: " + data.error.message }), { status: 500 });
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro_Log: " + e.message }), { status: 500 });
  }
}