import { useEffect, useState, useRef } from "react";
import mammoth from "mammoth";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import localforage from "localforage";

// Função de chamada para a API (que agora deve estar apontando para o Claude no seu backend)
async function gerarSugestaoAssistente(notas, textoAtual) {
  const urlApi = window.location.origin + '/analisar-openai'; // Mantendo a rota ou ajustando conforme seu Worker
  const response = await fetch(urlApi, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notas: notas, textoAtual: textoAtual })
  });
  
  if (!response.ok) throw new Error(`Erro: ${response.status}`);
  
  const dados = await response.json();
  // O ajuste aqui é garantir que pegamos o campo correto da resposta
  return dados.texto || dados.content?.[0]?.text || dados; 
}

const KEY_FINAL_TEXT = "entrelinhaspsi_v1_final_text";
const KEY_FINAL_TITLE = "entrelinhaspsi_v1_final_title";

export default function App() {
  const [assistenteCarregando, setAssistenteCarregando] = useState(false);
  const [assistenteEscrevendo, setAssistenteEscrevendo] = useState(false);
  const [notas, setNotas] = useState("");
  const [modoEdicaoNotas, setModoEdicaoNotas] = useState(false);
  const [finalTitle, setFinalTitle] = useState("Novo texto");
  const [finalText, setFinalText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef(null);

  // Gatilho do balão: aparece se houver conteúdo mínimo em um dos lados
  const podeMostrarBalao = (notas.trim().length > 10 || finalText.trim().length > 20) && !assistenteCarregando && !assistenteEscrevendo;

  const limparNotas = () => {
    if (window.confirm("Deseja apagar tudo?")) {
      setNotas("");
      localStorage.removeItem("notas");
    }
  };

  const copiarTexto = () => {
    if (!finalText) return;
    navigator.clipboard.writeText(finalText).then(() => alert("Texto copiado!"));
  };

  const digitarTexto = async (texto) => {
    setAssistenteEscrevendo(true);
    const separador = finalText.length > 0 ? "\n\n---\n\n" : "";
    const textoParaAdicionar = separador + texto;
    
    // Efeito de digitação fluida
    for (let i = 0; i < textoParaAdicionar.length; i++) {
      await new Promise(r => setTimeout(r, 10));
      setFinalText(prev => prev + textoParaAdicionar[i]);
    }
    setAssistenteEscrevendo(false);
  };

  const dispararSugestao = async () => {
    setAssistenteCarregando(true);
    try {
      const resultado = await gerarSugestaoAssistente(notas, finalText);
      if (resultado) await digitarTexto(`Sugestão para expandir o conteúdo:\n\n${resultado}`);
    } catch (e) { 
      console.error(e);
      alert("Houve um problema ao gerar a sugestão. Verifique a conexão.");
    }
    finally { setAssistenteCarregando(false); }
  };

  // Persistência de dados
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
    const blob = await Packer.toBlob(doc);
    saveAs(blob, (finalTitle || "texto") + ".docx");
  };

  return (
    <div className="app tema-1">
      <div className="topbar">
        <div className="logo-container">
          <div className="logo">AoLado Psi</div>
          <div className="subtitle">Transformando referências em conhecimento.</div>
        </div>
        <div className="save"><span>●</span> Alterações salvas automaticamente</div>
      </div>

      <div className="main">
        {/* Coluna da Esquerda: Insumos intelectuais */}
        <div className="column">
          <div className="column-header">
            <span>INSIGHTS / REFERÊNCIAS</span>
            <div className="actions">
              <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current.click()}>Abrir arquivo</button>
              <button onClick={limparNotas} style={{ color: "#d93025" }}>Limpar</button> 
              <button onClick={() => setModoEdicaoNotas(!modoEdicaoNotas)} className={modoEdicaoNotas ? "ativo" : ""}>
                {modoEdicaoNotas ? "Concluir" : "Escrever / Editar"}
              </button>
            </div>
          </div>
          <textarea 
            className={`editor ${!modoEdicaoNotas ? "readonly" : ""}`} 
            value={notas} 
            onChange={(e) => setNotas(e.target.value)} 
            placeholder="Escreva ou abra aqui tópicos, referências ou trechos para usar na sua produção..." 
            readOnly={!modoEdicaoNotas} 
          />
        </div>

        {/* Coluna da Direita: Construção do texto final */}
        <div className="column">
          <div className="column-header">
            <span>TEXTO FINAL</span>
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
          <div className={`area-texto ${podeMostrarBalao || assistenteCarregando ? "ia-ativa" : ""}`}>
            {podeMostrarBalao && (
              <div className="balao-ia" onClick={dispararSugestao}>
                💡 Sugerir continuação ou análise
              </div>
            )}
            
            {assistenteCarregando && (
              <div className="balao-ia carregando">...gerando sugestão...</div>
            )}

            <textarea 
              className="editor" 
              value={finalText} 
              onChange={(e) => setFinalText(e.target.value)} 
              placeholder="Comece a escrever sua aula ou palestra. Adicione insights à esquerda para habilitar sugestões." 
            />
          </div>
        </div>
      </div>
    </div>
  );
}