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

  // ROTA CLAUDE (Versão com Diagnóstico de Erro)
    if (path.includes("/api/claude") && request.method === "POST") {
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
            messages: [{ 
              role: "user", 
              content: `Analise o texto: ${body.notas || ""} ${body.textoAtual || ""}` 
            }],
          }),
        });

        const data = await res.json();

        // Se a Anthropic der erro, o Worker agora repassa a mensagem real
        if (!res.ok) {
          return new Response(JSON.stringify({ 
            error: "Erro na Anthropic", 
            mensagem_real: data.error?.message || "Verifique saldo/chave" 
          }), { status: res.status, headers: { "Content-Type": "application/json" } });
        }

        // Verifica se a resposta tem o formato esperado antes de ler
        if (data.content && data.content.length > 0) {
          return new Response(JSON.stringify({ texto: data.content[0].text }), { 
            headers: { "Content-Type": "application/json" } 
          });
        }
        
        return new Response(JSON.stringify({ error: "Estrutura de resposta inválida", raw: data }), { status: 500 });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Falha no Worker", detalhe: e.message }), { status: 500 });
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