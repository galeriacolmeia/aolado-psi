export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (path.includes("analisar-claude")) {
      try {
        const body = await request.json();
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": env.ANTHROPIC_API_KEY || "",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
           model: "claude-3-haiku-20240307",
            max_tokens: 4096,
            messages: [{ 
              role: "user", 
              content: `Analise o seguinte: Notas: ${body.notas || ""} | Texto Atual: ${body.textoAtual || ""}` 
            }],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return new Response(JSON.stringify({ error: "Erro na Anthropic", detalhes: data }), {
            status: res.status,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        return new Response(JSON.stringify({ texto: data.content[0].text }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno", msg: e.message }), { 
          status: 500, 
          headers: { "Access-Control-Allow-Origin": "*" } 
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};