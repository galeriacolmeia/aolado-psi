export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { notas, texto } = await request.json();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `
Estas são as notas de estudo:

${notas}

O texto já iniciado é:

${texto}

Continue o texto em tom de aula ou palestra psicanalítica.
`,
      }),
    });

    const data = await response.json();

    console.log("OPENAI RESPONSE:", JSON.stringify(data));

    return new Response(
      JSON.stringify({
        texto: data.output?.[0]?.content?.[0]?.text || "",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ erro: err.message }),
      { status: 500 }
    );
  }
}