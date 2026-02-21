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
  const [usuarioEstaDigitando, setUsuarioEstaDigitando] = useState(false);
  const [notesName, setNotesName] = useState("");
  const [finalTitle, setFinalTitle] = useState("Novo texto");
  const [finalText, setFinalText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [mostrarBalao, setMostrarBalao] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState("");
  const [acabouDeGerarIA, setAcabouDeGerarIA] = useState(false);
  const [iaEstaEscrevendo, setIaEstaEscrevendo] = useState(false);
  const [notas, setNotas] = useState("");
  const [modoEdicaoNotas, setModoEdicaoNotas] = useState(false);
  const fileInputRef = useRef(null);
  
useEffect(() => {
  if (!finalText && notas && !iaCarregando) {
    setMostrarBalao(true)
  } else {
    setMostrarBalao(false)
  }
}, [finalText, notas, iaCarregando])

useEffect(() => {
  if (
    notas.trim().length > 0 &&
    finalText.trim().length < 50 &&
    !iaCarregando &&
    !iaEstaEscrevendo &&
    !acabouDeGerarIA
  ) {
    setMostrarBalao(true)
  } else {
    setMostrarBalao(false)
  }
}, [notas, finalText, iaCarregando, iaEstaEscrevendo, acabouDeGerarIA])



const digitarTexto = async (texto) => {
  for (let i = 0; i < texto.length; i++) {
    await new Promise(r => setTimeout(r, 15)) // ← velocidade aqui
    setFinalText(prev => prev + texto[i])
  }
}

const gerarSugestao = async () => {
  if (iaCarregando) return
  if (!notas.trim()) return

  setIaCarregando(true)

  try {
    setFinalText("")

    const texto = await gerarSugestaoIA(notas, finalText)

    await digitarTexto(texto)

    setMostrarBalao(false)
    setAcabouDeGerarIA(true)

  } catch (e) {
    console.error(e)
  } finally {
    setIaCarregando(false)
  }

  console.log("NOTAS ENVIADAS PRA IA:", notas)
}

const escreverTextoIA = async (texto) => {
  setIaEstaEscrevendo(true)

  for (let i = 0; i < texto.length; i++) {
    await new Promise(r => setTimeout(r, 20))
    setFinalText(prev => prev + texto[i])
  }

  setIaEstaEscrevendo(false)
}

const exportarDocx = async () => {
  const doc = new Document({
    sections: [
      {
        children: finalText.split("\n").map(
          (linha) =>
            new Paragraph({
              children: [new TextRun(linha)],
            })
        ),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, sanitizeFilename(finalTitle) + ".docx");
};


useEffect(() => {
  if (
    iaCarregando ||
    iaEstaEscrevendo ||
    acabouDeGerarIA
  ) return

  if (!notesText || finalText.length < 20) {
    setMostrarBalao(false)
    return
  }

  const timer = setTimeout(() => {
    setMostrarBalao(true)
  }, 1500)

  return () => clearTimeout(timer)
}, [finalText, notesText, iaCarregando, iaEstaEscrevendo, acabouDeGerarIA])

useEffect(() => {
  const notasSalvas = localStorage.getItem("notas")
  if (notasSalvas) setNotas(notasSalvas)
}, [])

useEffect(() => {
  localStorage.setItem("notas", notas)
}, [notas])

useEffect(() => {
  const textoSalvo = localStorage.getItem("finalText")
  const tituloSalvo = localStorage.getItem("finalTitle")

  if (textoSalvo) setFinalText(textoSalvo)
  if (tituloSalvo) setFinalTitle(tituloSalvo)
}, [])

useEffect(() => {
  localStorage.setItem("finalText", finalText)
  localStorage.setItem("finalTitle", finalTitle)
}, [finalText, finalTitle])


  useEffect(() => {
    (async () => {
      const savedFinal = await localforage.getItem(KEY_FINAL_TEXT);
      if (typeof savedFinal === "string") setFinalText(savedFinal);

      const savedTitle = await localforage.getItem(KEY_FINAL_TITLE);
      if (typeof savedTitle === "string") setFinalTitle(savedTitle);

      const savedNotesText = await localforage.getItem(KEY_NOTES_TEXT);
      if (typeof savedNotesText === "string") setNotesText(savedNotesText);

      const savedNotesName = await localforage.getItem(KEY_NOTES_NAME);
      if (typeof savedNotesName === "string") setNotesName(savedNotesName);

      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localforage.setItem(KEY_FINAL_TEXT, finalText);
  }, [finalText, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localforage.setItem(KEY_FINAL_TITLE, finalTitle);
  }, [finalTitle, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localforage.setItem(KEY_NOTES_TEXT, notesText);
  }, [notesText, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localforage.setItem(KEY_NOTES_NAME, notesName);
  }, [notesName, hydrated]);

  const baseStyles = useMemo(() => ({
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: "16px",
    lineHeight: "1.15",
  }), []);

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const arrayBuffer = await file.arrayBuffer()

  const result = await mammoth.extractRawText({ arrayBuffer })

  const textoLimpo = result.value
    .replace(/\n{3,}/g, "\n\n")   // remove quebras excessivas
    .trim()

  setNotas(textoLimpo)
}

  async function onImportDocx(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotesName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const raw = (result.value || "").trim();

      const normalized = raw
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n");

      setNotesText(normalized || "(Não foi possível extrair texto deste arquivo.)");

    } catch (err) {
      console.error(err);
      setNotesText("(Erro ao importar .docx. Tente salvar no Word novamente e reimportar.)");
    } finally {
      e.target.value = "";
    }
  }

  async function exportDocx() {
    const title = sanitizeFilename(finalTitle);
    const lines = (finalText || "").split(/\r?\n/);

    const paragraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: finalTitle || "Novo texto",
            bold: true,
            font: "Helvetica",
            size: 32,
          }),
        ],
        spacing: { after: 240 },
      }),
      ...lines.map(line =>
        new Paragraph({
          children: [
            new TextRun({
              text: line.length ? line : " ",
              font: "Helvetica",
              size: 32,
            }),
          ],
          spacing: { line: 276 },
        })
      ),
    ];

    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title}.docx`);
  }

  async function clearAll() {
    if (!confirm("Limpar notas e texto?")) return;

    setNotesName("");
    setNotesText("");
    setFinalTitle("Novo texto");
    setFinalText("");

    await localforage.removeItem(KEY_NOTES_NAME);
    await localforage.removeItem(KEY_NOTES_TEXT);
    await localforage.removeItem(KEY_FINAL_TITLE);
    await localforage.removeItem(KEY_FINAL_TEXT);
  }

return (
  <div className="app tema-1">
    <div className="topbar">
      <div className="logo">AoLado Psi</div>
      <div className="save">✓ Salvo</div>
    </div>

    <div className="main">

{/* COLUNA NOTAS */}
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



      {/* COLUNA TEXTO */}

      <div className="column">
        <div className="column-header">
          <span>TEXTO</span>

          <div className="actions">

          <button onClick={exportarDocx}>Exportar .docx</button>
          <button onClick={() => setFinalText("")}>Limpar tudo</button>
          <button onClick={() => {setFinalTitle("Novo texto")
          setFinalText("")
        }}
      >
        Novo texto
             </button>
          </div>
        </div>

        <div className={`area-texto ${iaCarregando ? "ia-ativa" : ""}`}>
 {/* TÍTULO DO TEXTO */}
  <input
    className="titulo-texto"
    value={finalTitle}
    onChange={(e) => setFinalTitle(e.target.value)}
    placeholder="Título do texto"
  />

          {mostrarBalao && (
            <div className="balao-ia" onClick={gerarSugestao}>
              {iaCarregando
                ? "… gerando texto …"
                : "💡 Deseja sugestões a partir das notas?"}
            </div>
          )}

          <textarea
            className="editor"
            value={finalText}
            onChange={(e) => {
              setFinalText(e.target.value)
              setAcabouDeGerarIA(false)
            }}
            placeholder="Escreva aqui…"
          />

        </div>
      </div>

    </div>
  </div>
)
}