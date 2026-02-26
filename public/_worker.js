export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Rota que o seu App.jsx chama
    if (url.pathname === "/analisar-openai" && request.method === "POST") {
      try {
        const { notas, textoAtual } = await request.json();

        // Chamada para a API do Claude (Anthropic)
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
           "x-api-key": env.ANTHROPIC_API_KEY, // Alterado para coincidir com o seu painel
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1500,
            messages: [
              {
                role: "user",
                content: `Atue como um assistente de escrita intelectual para psicólogos.
                
                REFERÊNCIAS: ${notas}
                TEXTO ATUAL: ${textoAtual}
                
                Com base nas referências fornecidas, gere uma sugestão de continuação para este texto de aula ou palestra. 
                Escreva de forma fluida e profissional. Vá direto ao texto, sem comentários iniciais.`
              }
            ]
          })
        });

        const data = await response.json();

        if (data.error) {
          return new Response(JSON.stringify({ texto: "Erro na API: " + data.error.message }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }

        // O Claude entrega o texto dentro de content[0].text
        const sugestao = data.content[0].text;

        return new Response(JSON.stringify({ texto: sugestao }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ texto: "Erro no servidor: " + e.message }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Se não for a rota da API, o Cloudflare serve os arquivos estáticos (o seu App React)
    return env.ASSETS.fetch(request);
  }
};