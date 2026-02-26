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
        // TESTE DE CHAVE: Se a chave for lida como vazia, enviamos um erro claro
        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ texto: "Erro: Chave ANTHROPIC_API_KEY não encontrada no Cloudflare." }), { status: 500, headers: corsHeaders });
        }

        const { notas, textoAtual } = await request.json();

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey.trim(), // .trim() remove espaços invisíveis
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: [{ role: "user", content: `Notas: ${notas}\nTexto: ${textoAtual}` }]
          })
        });

        const data = await res.json();
        
        if (data.error) {
          return new Response(JSON.stringify({ texto: "Erro na Anthropic: " + data.error.message }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ texto: data.content[0].text }), { headers: corsHeaders });

      } catch (e) {
        return new Response(JSON.stringify({ texto: "Erro no Worker: " + e.message }), { status: 500, headers: corsHeaders });
      }
    }
    return env.ASSETS.fetch(request);
  }
};