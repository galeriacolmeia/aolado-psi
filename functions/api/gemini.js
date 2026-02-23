export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    // Voltando para o Flash que é menos rigoroso com filtros que o Pro
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Traduza e organize estas notas de estudo para um formato de tópicos claros: " + notas }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await res.json();

    // Se houver texto, ele entrega. Se não, ele vasculha o JSON atrás do erro real.
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const texto = data.candidates[0].content.parts[0].text;
      return new Response(JSON.stringify({ texto }), { headers: { "Content-Type": "application/json" } });
    } else {
      // Captura o erro mesmo se 'candidates' estiver vazio
      const erroGoogle = data.promptFeedback?.blockReason || data.error?.message || "Bloqueio de conteúdo sensível";
      return new Response(JSON.stringify({ texto: "O Gemini silenciou a resposta por: " + erroGoogle }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}