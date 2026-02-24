export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // 1. TRATAMENTO DE CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    // 2. ROTA CLAUDE
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
            model: "claude-3-5-sonnet-latest",
            max_tokens: 1024,
            messages: [{ role: "user", content: `Analise: ${body.notas || ""} ${body.textoAtual || ""}` }],
          }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(res.ok ? { texto: data.content[0].text } : { error: "Erro na API Anthropic", detalhes: data }), {
          status: res.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno no Worker", msg: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // 3. ROTA OPENAI (Para resolver o 405)
    if (path.includes("api/ia")) {
      try {
        const body = await request.json();
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: body.prompt || body.text || "Oi" }],
          }),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};