export async function onRequestPost(context) {
  const GEMINI_KEY = context.env.GEMINI_API_KEY;
  
  // Se a chave não for encontrada, o erro 500 acontece aqui
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "Chave GEMINI_API_KEY não configurada no Cloudflare" }), { status: 500 });
  }

  const { notas } = await context.request.json();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

  const payload = {
    contents: [{
      parts: [{ 
        text: `Aja como um assistente acadêmico para psicanalistas. O usuário está escrevendo um texto para uma aula ou palestra. 
        Com base nestas notas (extraídas de livros, textos e reflexões), ofereça uma síntese estruturada, conexões teóricas e sugestões de desenvolvimento para o texto acadêmico:
        ---
        ${notas}` 
      }]
    }],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Erro na API do Google" }), { status: response.status });
    }

    const texto = data.candidates[0].content.parts[0].text;
    return new Response(JSON.stringify({ texto }), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}