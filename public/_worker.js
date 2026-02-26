export default {
  async fetch(request, env) {
    // Configuração de CORS para permitir que o navegador receba a resposta
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responde a requisições de verificação (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

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
            system: "Atue como um assistente para psicólogos em textos acadêmicos.",
            messages: [
              {
                role: "user",
                content: `Notas: ${notas || ""}\nTexto: ${textoAtual || ""}`
              }
            ]
          })
        });

        const data = await response.json();

        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ texto: "Erro: " + e.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};