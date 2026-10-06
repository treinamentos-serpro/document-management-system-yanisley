import { useEffect, useState } from 'react';
import { downloadDocument, listDocuments, uploadDocument } from './services/documents.js';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import './App.css';

export default function App() {
  const [ownerInput, setOwnerInput] = useState('usuario-1');
  const [activeOwner, setActiveOwner] = useState('usuario-1');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [listError, setListError] = useState('');
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    setListError('');
    setErrorMessage('');
    listDocuments(activeOwner)
      .then((result) => {
        if (isCurrent) setDocuments(result);
      })
      .catch((error) => {
        if (isCurrent) {
          setListError(error.message);
          setErrorMessage(error.message);
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeOwner, listVersion]);

  async function handleUpload(file) {
    setIsUploading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      await uploadDocument(activeOwner, file);
      setStatusMessage('Documento enviado.');
      setListVersion((version) => version + 1);
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setErrorMessage('');
    try {
      const blob = await downloadDocument(activeOwner, document.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleOwnerSubmit(event) {
    event.preventDefault();
    const nextOwner = ownerInput.trim();
    if (!nextOwner) {
      setErrorMessage('Informe um identificador de usuário.');
      return;
    }

    setDocuments([]);
    setStatusMessage('');
    setErrorMessage('');
    if (nextOwner === activeOwner) {
      setListVersion((version) => version + 1);
    } else {
      setActiveOwner(nextOwner);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-mark" aria-hidden="true">D</div>
          <div>
            <p className="eyebrow">ARQUIVO DIGITAL</p>
            <h1>Documentos</h1>
          </div>
          <form className="identity-form" onSubmit={handleOwnerSubmit}>
            <label htmlFor="owner-id">Usuário</label>
            <div className="identity-controls">
              <input
                id="owner-id"
                value={ownerInput}
                maxLength={100}
                onChange={(event) => setOwnerInput(event.target.value)}
                aria-label="Identificador do usuário"
              />
              <button type="submit" className="quiet-button">Abrir arquivo</button>
            </div>
          </form>
        </div>
      </header>

      <div className="content">
        <section className="upload-section" aria-labelledby="upload-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NOVO DOCUMENTO</p>
              <h2 id="upload-heading">Adicionar ao arquivo</h2>
            </div>
            <span className="limit-note">Máximo de 10 MiB</span>
          </div>
          <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
        </section>

        <section className="documents-section" aria-labelledby="documents-heading">
          <div className="section-heading list-heading">
            <div>
              <p className="eyebrow">ARQUIVO DE {activeOwner}</p>
              <h2 id="documents-heading">Seus documentos</h2>
            </div>
            <button
              type="button"
              className="refresh-button"
              onClick={() => setListVersion((version) => version + 1)}
              disabled={isLoading}
              aria-label="Atualizar lista de documentos"
              title="Atualizar lista"
            >
              <span aria-hidden="true">↻</span>
            </button>
          </div>

          {statusMessage && <p className="status-message" role="status">{statusMessage}</p>}
          {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            loadError={listError}
            downloadingId={downloadingId}
            onDownload={handleDownload}
          />
        </section>
      </div>
    </main>
  );
}
