export async function onRequest(context) {
  // 1. Pega a chave do ambiente
  const GEMINI_KEY = context.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "Chave não encontrada no Cloudflare" }), { status: 500 });
  }

  // 2. Tenta ler o corpo da requisição
  try {
    const { notas } = await context.request.json();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Você é um assistente acadêmico para psicanalistas. Transforme estas notas de estudo em uma estrutura para aula ou palestra: ${notas}` }]
        }]
      })
    });

    const data = await response.json();

    // Verifica se o Google retornou erro (ex: chave inválida)
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), { status: 500 });
    }

    const texto = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro interno: " + e.message }), { status: 500 });
  }
}