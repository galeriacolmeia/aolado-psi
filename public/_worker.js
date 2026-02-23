export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Se a requisição for para a nossa API do Claude
    if (url.pathname === "/api/claude" && request.method === "POST") {
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
            messages: [{ role: "user", content: `Notas: ${notas}\n\nTexto atual: ${textoAtual}` }],
          }),
        });

        const data = await response.json();
        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // Se não for a API, deixa o Cloudflare servir os arquivos normais do site
    return env.ASSETS.fetch(request);
  },
};