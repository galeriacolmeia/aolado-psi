export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave" }), { status: 500 });

  try {
    const { notas } = await context.request.json();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${chave}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: "Contexto: Transcrição acadêmica para estudo. Tarefa: Organize estas notas de estudo em tópicos estruturados, mantendo a terminologia original: " + notas 
          }] 
        }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: {
          temperature: 0.4, // Menor temperatura = resposta mais focada e menos chances de bloqueio
          topP: 0.8
        }
      })
    });

    const data = await res.json();
    
    // Se o Google bloquear, ele enviará um 'finishReason'
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const motivoBloqueio = data.candidates?.[0]?.finishReason;

    if (texto) {
      return new Response(JSON.stringify({ texto }), { headers: { "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ texto: "O Gemini recusou a geração por segurança (Motivo: " + motivoBloqueio + "). Tente notas menos específicas." }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}