export async function gerarSugestaoIA(notas, texto) {
  const res = await fetch("/api/ia", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notas, texto }),
  });

  const data = await res.json();
  return data.texto;
}
