export async function onRequest(context) {
  const chave = context.env.GEMINI_API_KEY;
  if (!chave) return new Response(JSON.stringify({ error: "Falta chave ANTHROPIC_API_KEY" }), { status: 500 });

  // Endpoint oficial para listar modelos
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${chave}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // Filtramos apenas os modelos que suportam a geração de conteúdo (texto)
    const modelosValidos = data.models
      ?.filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace("models/", ""))
      .join(", ");

    return new Response(JSON.stringify({ 
      texto: "Lista de modelos disponíveis para a sua chave: " + (modelosValidos || "Nenhum modelo encontrado.") 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro na varredura: " + e.message }), { status: 500 });
  }
}