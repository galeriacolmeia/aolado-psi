export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Verificando se a URL contém o nome que o botão enviou
    if (url.pathname.includes("analisar-claude")) {
      
      // Se for o navegador checando a conexão (OPTIONS)
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          }
        });
      }

      try {
        const body = await request.json();
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 4096,
            messages: [{ role: "user", content: `Analise: ${body.notas || ""} ${body.textoAtual || ""}` }],
          }),
        });

        const data = await res.json();
        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // Se não for a rota da IA, mostra o site normal
    return env.ASSETS.fetch(request);
  }
};