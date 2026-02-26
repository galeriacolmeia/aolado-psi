export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (new URL(request.url).pathname === "/analisar-openai") {
      try {
        // 1. Verificação da Chave
        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error("VARIÁVEL_AUSENTE: O Cloudflare não entregou a chave ao Worker.");
        }

        const body = await request.json();
        
        // 2. Chamada para Anthropic
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey.trim(),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-opus-latest",
max_tokens: 1024,,
            messages: [{
              role: "user",
              content: `Notas: ${body.notas || "Sem notas"}\nTexto: ${body.textoAtual || "Sem texto"}`
            }]
          })
        });

        const data = await response.json();

        // 3. Verificação de Erro da Anthropic (Saldo, Modelo, etc)
        if (!response.ok) {
          throw new Error(`ANTHROPIC_ERRO_${response.status}: ${JSON.stringify(data.error)}`);
        }

        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (e) {
        // Este retorno vai aparecer no seu console do navegador
        return new Response(JSON.stringify({ texto: "DEBUG: " + e.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};