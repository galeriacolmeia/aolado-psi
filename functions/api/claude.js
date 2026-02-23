export async function onRequest(context) {
  const chave = context.env.ANTHROPIC_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave Claude" }), { status: 500 });

  try {
    const { notas } = await context.request.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        system: "Você é um assistente de escrita para psicanalistas. Seu estilo é sóbrio, acadêmico e profundo. Não use saudações, não faça introduções. Vá direto ao texto estruturado, expandindo as notas com rigor teórico.",
        messages: [{ role: "user", content: "Organize e amplie estas notas: " + notas }]
      })
    });

    const data = await res.json();
    const texto = data.content[0].text;

    return new Response(JSON.stringify({ texto }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}