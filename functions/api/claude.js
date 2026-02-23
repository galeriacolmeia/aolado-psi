// Versao 1.1 - Teste de rota

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { notas, textoAtual } = await request.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        system: "Você é um interlocutor de alto nível para uma psicanalista. Use tom sóbrio, clínico e denso. Evite tópicos e bullets. Use vocabulário técnico da psicanálise.",
        messages: [
          { role: "user", content: `Notas: ${notas}\n\nTexto atual: ${textoAtual}` }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error }), { 
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ texto: data.content[0].text }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}