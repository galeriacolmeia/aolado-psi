export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname; // Removido o toLowerCase aqui para testar

    // LOG DE DIAGNÓSTICO (Aparece no painel do Cloudflare se precisar)
    console.log(`Recebendo pedido para: ${path} [${request.method}]`);

    // TESTE
    if (path.includes("test-env")) {
      return new Response(JSON.stringify({ status: "ok", path }), { headers: { "Content-Type": "application/json" } });
    }

    // ROTA CLAUDE - Usando match mais flexível
    if (path.includes("/api/claude")) {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 }); // Para erros de CORS
      
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
        if (!res.ok) return new Response(JSON.stringify(data), { status: res.status });
        return new Response(JSON.stringify({ texto: data.content[0].text }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // ROTA OPENAI
    if (path.includes("/api/ia")) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "oi" }] }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: res.status });
    }

    return env.ASSETS.fetch(request);
  }
};