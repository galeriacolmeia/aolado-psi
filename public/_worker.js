
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/analisar-openai" && request.method === "POST") {
      try {
        const { notas, textoAtual } = await request.json();

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY, 
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `Referência: ${notas || "vazio"}\nTexto: ${textoAtual || "vazio"}`
              }
            ]
          })
        });

        const data = await response.json();

        // Se a Anthropic respondeu algo diferente de sucesso, pegamos o erro real
        if (!response.ok) {
          return new Response(JSON.stringify({ 
            texto: `Erro Anthropic (${response.status}): ${JSON.stringify(data.error)}` 
          }), { status: 500 });
        }

        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ texto: "Erro Worker: " + e.message }), { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};