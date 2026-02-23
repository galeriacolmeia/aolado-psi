import { gerarSugestaoIA } from "./ia"; // Esta é sua função OpenAI atual
import { useEffect, useMemo, useState, useRef } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import localforage from "localforage";

// Função para chamar o Gemini via Cloudflare Pages Function

async function gerarSugestaoGemini(notas, textoAtual) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notas: notas, textoAtual: textoAtual }) // Garantindo o nome das propriedades
  });  
  if (!response.ok) {
     console.error("Erro na chamada:", response.status);
     // Se der 404 aqui, o arquivo gemini.js pode estar com nome diferente no GitHub
     throw new Error(`Erro ${response.status} ao acessar a API`);
  }
  
  const data = await response.json();
  return data.texto;
}
const KEY_FINAL_TEXT = "entrelinhaspsi_v1_final_text";
const KEY_FINAL_TITLE = "entrelinhaspsi_v1_final_title";

function sanitizeFilename(name) {
  return (name || "texto")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 80) || "texto";
}

export default function App() {
  const [iaCarregando, setIaCarregando] = useState(false);
  const [iaEstaEscrevendo, setIaEstaEscrevendo] = useState(false);
  const [acabouDeGerarIA, setAcabouDeGerarIA] = useState(false);

  const [notas, setNotas] = useState("");
  const [modoEdicaoNotas, setModoEdicaoNotas] = useState(false);
  const [finalTitle, setFinalTitle] = useState("Novo texto");
  const [finalText, setFinalText] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const fileInputRef = useRef(null);

  const podeMostrarBalao =
    notas.trim().length > 0 &&
    !iaCarregando &&
    !iaEstaEscrevendo;

  const digitarTexto = async (texto) => {
    setIaEstaEscrevendo(true);
    // Adicionamos um separador visual se já houver texto
    const separador = finalText.length > 0 ? "\n\n---\n\n" : "";
    const textoCompleto = separador + texto;

    for (let i = 0; i < textoCompleto.length; i++) {
      await new Promise(r => setTimeout(r, 10));
      setFinalText(prev => prev + textoCompleto[i]);
    }
    setIaEstaEscrevendo(false);
  };

const gerarSugestaoSomada = async () => {
  if (iaCarregando || !notas.trim()) return;

  setIaCarregando(true);
  setAcabouDeGerarIA(false);

  try {
    const [resOpenAI, resGemini] = await Promise.allSettled([
      gerarSugestaoIA(notas, finalText),
      gerarSugestaoGemini(notas, finalText)
    ]);

    let textoFinalAgrupado = "";

    // Adiciona o resultado da OpenAI (sem o nome da IA)
    if (resOpenAI.status === "fulfilled") {
      const t = typeof resOpenAI.value === "string" ? resOpenAI.value : resOpenAI.value?.texto;
      if (t) textoFinalAgrupado += `${t}\n\n`;
    }

    // Adiciona um separador discreto e o resultado do Gemini (sem o nome da IA)
    if (resGemini.status === "fulfilled") {
      textoFinalAgrupado += `---\n\n${resGemini.value}`;
    }

    if (!textoFinalAgrupado) {
      setFinalText(prev => prev + "\n⚠️ Não foi possível gerar a sugestão agora.");
    } else {
      await digitarTexto(textoFinalAgrupado);
      setAcabouDeGerarIA(true);
    }
  } catch (e) {
    console.error(e);
    setFinalText(prev => prev + "\n⚠️ Erro ao processar.");
  } finally {
    setIaCarregando(false);
  }
};

  // ... (Seus outros useEffects e funções de exportação permanecem iguais)
  useEffect(() => {
    const notasSalvas = localStorage.getItem("notas");
    if (notasSalvas) setNotas(notasSalvas);
  }, []);

  useEffect(() => {
    if (notas !== "") localStorage.setItem("notas", notas);
  }, [notas]);

  useEffect(() => {
    (async () => {
      const savedFinal = await localforage.getItem(KEY_FINAL_TEXT);
      const savedTitle = await localforage.getItem(KEY_FINAL_TITLE);
      if (savedFinal && !savedFinal.startsWith("⚠️")) setFinalText(savedFinal);
      if (savedTitle) setFinalTitle(savedTitle);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localforage.setItem(KEY_FINAL_TEXT, finalText);
    localforage.setItem(KEY_FINAL_TITLE, finalTitle);
  }, [finalText, finalTitle, hydrated]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setNotas(result.value.replace(/\n{3,}/g, "\n\n").trim());
  };

  const exportarDocx = async () => {
    const doc = new Document({
      sections: [{
        children: finalText.split("\n").map(l => new Paragraph({ children: [new TextRun(l)] })),
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, sanitizeFilename(finalTitle) + ".docx");
  };

  return (
    <div className="app tema-1">
      <div className="topbar">
        <div className="logo">AoLado Psi</div>
        <div className="save">✓ Salvo</div>
      </div>

      <div className="main">
        <div className="column">
          <div className="column-header">
            <span>NOTAS</span>
            <div className="actions">
              <input type="file" accept=".docx" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current.click()}>Abrir notas</button>
              <button onClick={() => setModoEdicaoNotas(p => !p)} className={modoEdicaoNotas ? "ativo" : ""}>
                {modoEdicaoNotas ? "Concluir" : "Editar"}
              </button>
            </div>
          </div>
          <textarea
            className={`editor ${!modoEdicaoNotas ? "readonly" : ""}`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Suas notas…"
            readOnly={!modoEdicaoNotas}
          />
        </div>

        <div className="column">
          <div className="column-header">
            <span>TEXTO</span>
            <div className="actions">
              <button onClick={exportarDocx}>Exportar .docx</button>
              <button onClick={() => { setFinalText(""); setAcabouDeGerarIA(false); }}>Limpar tudo</button>
              <button onClick={() => { setFinalTitle("novo texto"); setFinalText(""); setAcabouDeGerarIA(false); }}>Novo Texto</button>
            </div>
          </div>

          <div className="titulo-wrapper">
            <span className="label-titulo">Título:</span>
            <input className="titulo-texto" value={finalTitle} onChange={(e) => setFinalTitle(e.target.value)} placeholder="Digite o título…" />
          </div>

          <div className={`area-texto ${iaCarregando ? "ia-ativa" : ""}`}>
          {podeMostrarBalao && (
  <div className="balao-ia" onClick={gerarSugestaoSomada}>
    💡 Deseja uma sugestão baseada nas suas notas?
  </div>
)}

{iaCarregando && (
  <div className="balao-ia carregando">
    …gerando texto…
  </div>
)}

            <textarea
              className="editor"
              value={finalText}
              onChange={(e) => { setFinalText(e.target.value); setAcabouDeGerarIA(false); }}
              placeholder="Escreva aqui…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}