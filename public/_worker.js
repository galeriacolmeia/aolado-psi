export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // Garante que só processamos a rota correta
    const url = new URL(request.url);
    if (url.pathname.includes("/analisar-openai")) {
      try {
        const { notas, textoAtual } = await request.json();

        // O segredo está nesta URL (/v1/messages) e nos headers
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY.trim(),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
           model="claude-sonnet-4-6",
            max_tokens: 1024,
            messages: [
              { role: "user", content: `Notas: ${notas}\n\nTexto: ${textoAtual}` }
            ]
          })
        });

        const data = await response.json();

        if (!response.ok) {
          return new Response(JSON.stringify({ 
            texto: `DEBUG: Erro ${response.status} - ${JSON.stringify(data.error)}` 
          }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ texto: "DEBUG Catch: " + e.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};