import { gerarSugestaoIA } from "./ia";
import { useEffect, useMemo, useState, useRef } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import localforage from "localforage";

const KEY_FINAL_TEXT = "entrelinhaspsi_v1_final_text";
const KEY_FINAL_TITLE = "entrelinhaspsi_v1_final_title";
const KEY_NOTES_TEXT = "entrelinhaspsi_v1_notes_text";
const KEY_NOTES_NAME = "entrelinhaspsi_v1_notes_name";

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
  !iaEstaEscrevendo &&
  finalText.trim().length > 0;

  const digitarTexto = async (texto) => {
    setIaEstaEscrevendo(true);

    for (let i = 0; i < texto.length; i++) {
      await new Promise(r => setTimeout(r, 15));
      setFinalText(prev => prev + texto[i]);
    }

    setIaEstaEscrevendo(false);
  };

 const gerarSugestao = async () => {
  if (iaCarregando || !notas.trim()) return;

  setIaCarregando(true);
  setAcabouDeGerarIA(false);
  setFinalText("");

  try {
    const resposta = await gerarSugestaoIA(notas, finalText);

    const texto =
      typeof resposta === "string"
        ? resposta
        : resposta?.texto || "";

    if (!texto) {
      setFinalText("⚠️ A IA não retornou texto.");
      return;
    }

    await digitarTexto(texto);
    setAcabouDeGerarIA(true);

  } catch (e) {
    console.error(e);
    setFinalText("⚠️ Erro ao gerar texto.");
  } finally {
    setIaCarregando(false);
  }
};

useEffect(() => {
  const notasSalvas = localStorage.getItem("notas");
  if (notasSalvas) {
    setNotas(notasSalvas);
  }
}, []);

useEffect(() => {
  if (notas !== "") {
    localStorage.setItem("notas", notas);
  }
}, [notas]);

  useEffect(() => {
    (async () => {
      const savedFinal = await localforage.getItem(KEY_FINAL_TEXT);
      const savedTitle = await localforage.getItem(KEY_FINAL_TITLE);

    if (savedFinal && !savedFinal.startsWith("⚠️")) {
  setFinalText(savedFinal);
}
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

    const textoLimpo = result.value
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    setNotas(textoLimpo);
  };

  const exportarDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: finalText.split("\n").map(
            linha => new Paragraph({ children: [new TextRun(linha)] })
          ),
        },
      ],
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

        {/* NOTAS */}
        <div className="column">

          <div className="column-header">
            <span>NOTAS</span>

            <div className="actions">

              <input
                type="file"
                accept=".docx"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />

              <button onClick={() => fileInputRef.current.click()}>
                Abrir notas
              </button>

              <button
                onClick={() => setModoEdicaoNotas(prev => !prev)}
                className={modoEdicaoNotas ? "ativo" : ""}
              >
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

        {/* TEXTO */}
        <div className="column">

          <div className="column-header">
            <span>TEXTO</span>

            <div className="actions">
              <button onClick={exportarDocx}>Exportar .docx</button>

              <button onClick={() => {
                setFinalText("");
                setAcabouDeGerarIA(false);
              }}>
                Limpar tudo
              </button>

              <button onClick={() => {
                setFinalTitle("Novo texto");
                setFinalText("");
                setAcabouDeGerarIA(false);
              }}>
                Novo texto
              </button>

            </div>
          </div>

<div className="titulo-wrapper">
  <span className="label-titulo">Novo texto1:</span>

  <input
    className="titulo-texto"
    value={finalTitle}
    onChange={(e) => setFinalTitle(e.target.value)}
    placeholder="Digite o título…"
  />
</div>

          <div className={`area-texto ${iaCarregando ? "ia-ativa" : ""}`}>

            <input
              className="titulo-texto"
              value={finalTitle}
              onChange={(e) => setFinalTitle(e.target.value)}
              placeholder="Título do texto"
            />

            {podeMostrarBalao && (
              <div className="balao-ia" onClick={gerarSugestao}>
                💡 Deseja sugestões a partir das notas?
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
              onChange={(e) => {
                setFinalText(e.target.value);
                setAcabouDeGerarIA(false);
              }}
              placeholder="Escreva aqui…"
            />

          </div>
        </div>

      </div>
    </div>
  );
}