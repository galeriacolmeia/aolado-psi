import { gerarSugestaoIA } from "./ia";
import { useEffect, useMemo, useState, useRef } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import localforage from "localforage";

async function gerarSugestaoClaude(notas, textoAtual) {
  const urlApi = window.location.origin + '/analisar-openai';
  const response = await fetch(urlApi, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notas: notas, textoAtual: textoAtual })
  });
  if (!response.ok) throw new Error(`Erro: ${response.status}`);
  return await response.json();
}

const KEY_FINAL_TEXT = "entrelinhaspsi_v1_final_text";
const KEY_FINAL_TITLE = "entrelinhaspsi_v1_final_title";

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

  const podeMostrarBalao = notas.trim().length > 0 && !iaCarregando && !iaEstaEscrevendo;

  const limparNotas = () => {
    if (window.confirm("Deseja apagar todas as notas?")) {
      setNotas("");
      localStorage.removeItem("notas");
    }
  };

  const copiarTexto = () => {
    if (!finalText) return;
    navigator.clipboard.writeText(finalText).then(() => alert("Texto copiado!"));
  };

  const digitarTexto = async (texto) => {
    setIaEstaEscrevendo(true);
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
    try {
      const resultado = await gerarSugestaoClaude(notas, finalText);
      const texto = typeof resultado === "string" ? resultado : resultado?.texto;
      if (texto) await digitarTexto(`\n\nSegue uma sugestão:\n\n${texto}`);
    } catch (e) { console.error(e); }
    finally { setIaCarregando(false); }
  };

  useEffect(() => {
    const n = localStorage.getItem("notas"); if (n) setNotas(n);
    (async () => {
      const st = await localforage.getItem(KEY_FINAL_TEXT);
      const tt = await localforage.getItem(KEY_FINAL_TITLE);
      if (st) setFinalText(st); if (tt) setFinalTitle(tt);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (notas !== "") localStorage.setItem("notas", notas);
    if (hydrated) {
      localforage.setItem(KEY_FINAL_TEXT, finalText);
      localforage.setItem(KEY_FINAL_TITLE, finalTitle);
    }
  }, [notas, finalText, finalTitle, hydrated]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    setNotas(res.value.trim());
  };

  const exportarDocx = async () => {
    const doc = new Document({ sections: [{ children: finalText.split("\n").map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
    saveAs(await Packer.toBlob(doc), (finalTitle || "texto") + ".docx");
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
              <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current.click()}>Abrir notas</button>
              <button onClick={limparNotas} style={{ color: "#d93025" }}>Limpar</button> 
              <button onClick={() => setModoEdicaoNotas(!modoEdicaoNotas)} className={modoEdicaoNotas ? "ativo" : ""}>
                {modoEdicaoNotas ? "Concluir" : "Editar"}
              </button>
            </div>
          </div>
          <textarea className={`editor ${!modoEdicaoNotas ? "readonly" : ""}`} value={notas} onChange={(e) => setNotas(e.target.value)} readOnly={!modoEdicaoNotas} />
        </div>
        <div className="column">
          <div className="column-header">
            <span>TEXTO</span>
            <div className="actions">
              <button onClick={copiarTexto} style={{ fontWeight: "bold", color: "#1a73e8" }}>Copiar Texto</button>
              <button onClick={exportarDocx}>Exportar .docx</button>
              <button onClick={() => setFinalText("")}>Limpar tudo</button>
            </div>
          </div>
          <div className="titulo-wrapper">
            <span className="label-titulo">Título:</span>
            <input className="titulo-texto" value={finalTitle} onChange={(e) => setFinalTitle(e.target.value)} />
          </div>
          <div className={`area-texto ${(podeMostrarBalao || iaCarregando) ? "ia-ativa" : ""}`}>
            {podeMostrarBalao && <div className="balao-ia" onClick={gerarSugestaoSomada}>💡 Sugerir análise baseada nas notas</div>}
            {iaCarregando && <div className="balao-ia carregando">...escrevendo texto...</div>}
            <textarea className="editor" value={finalText} onChange={(e) => setFinalText(e.target.value)} placeholder="A análise aparecerá aqui..." />
          </div>
        </div>
      </div>
    </div>
  );
}