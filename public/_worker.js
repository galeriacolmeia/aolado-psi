export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.toLowerCase();

    // ROTA DE TESTE ABSOLUTO
    if (path.includes("/test-env")) {
      return new Response(JSON.stringify({
        message: "Worker está operante",
        claudeKey: !!env.ANTHROPIC_API_KEY,
        openaiKey: !!env.OPENAI_API_KEY
      }), { headers: { "Content-Type": "application/json" } });
    }

    // ROTA CLAUDE
    if (path.includes("/api/claude") && request.method === "POST") {
      try {
        const { notas, textoAtual } = await request.json();
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
            system: "Você é um interlocutor de alto nível para uma psicanalista.",
            messages: [{ role: "user", content: `Notas: ${notas || ""}\n\nTexto atual: ${textoAtual || ""}` }],
          }),
        });

        const data = await res.json();
        return new Response(JSON.stringify({ texto: data.content[0].text }), { 
          headers: { "Content-Type": "application/json" } 
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // ROTA OPENAI (IA)
    if (path.includes("/api/ia") && request.method === "POST") {
      try {
        const { notas, textoAtual } = await request.json();
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: `Notas: ${notas}\n\nTexto: ${textoAtual}` }],
          }),
        });
        const data = await res.json();
        if (!res.ok) return new Response(JSON.stringify(data), { status: res.status });
        return new Response(JSON.stringify({ sugestao: data.choices[0].message.content }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};