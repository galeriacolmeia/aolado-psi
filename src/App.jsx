import { gerarSugestaoIA } from "./ia"; // Esta é sua função OpenAI atual
import { useEffect, useMemo, useState, useRef } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import localforage from "localforage";

// Função para chamar o Gemini via Cloudflare Pages Function

async function gerarSugestaoClaude(notas, textoAtual) {
  // Usando a URL completa para não ter erro de rota
  const urlApi = window.location.origin + '/analisar-claude';
  
  const response = await fetch(urlApi, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notas: notas, textoAtual: textoAtual })
  });

  if (!response.ok) {
    // Se der erro, vamos tentar ler o que o Worker respondeu
    const errorText = await response.text();
    console.error("Resposta do servidor:", errorText);
    throw new Error(`Erro Claude: ${response.status}`);
  }

  return await response.json();
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

  // Criamos uma função interna para "digitar" cada resposta assim que ela chegar
  const processarResposta = async (promessa, nomeIA) => {
    try {
      const resultado = await promessa;
      const texto = typeof resultado === "string" ? resultado : resultado?.texto;
      if (texto) {
        // Adiciona um cabeçalho discreto para ela saber de qual IA veio
        await digitarTexto(`\n\n[Sugestão ${nomeIA}]:\n${texto}`);
      }
    } catch (e) {
      console.error(`Erro na ${nomeIA}:`, e);
    }
  };


  try {
    // DISPARO EM PARALELO: 
    // O Claude é disparado primeiro. Não usamos 'await' na frente do processarResposta
    // para que eles rodem de forma independente!
    
    processarResposta(gerarSugestaoClaude(notas, finalText), "Claude");
    processarResposta(gerarSugestaoIA(notas, finalText), "OpenAI");

    // Mantemos o loading ativo por um tempo ou até o fim das chamadas
    setAcabouDeGerarIA(true);
  } catch (e) {
    console.error(e);
  } finally {
    // Opcional: remover o loading após o disparo ou após a primeira resposta
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
    💡 Deseja uma analise sugestão baseada nas suas notas?
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