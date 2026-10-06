function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, loadError, downloadingId, onDownload }) {
  if (isLoading && documents.length === 0) {
    return <p className="empty-state" role="status">Carregando documentos...</p>;
  }

  if (loadError && documents.length === 0) {
    return <p className="empty-state" role="status">Não foi possível carregar os documentos.</p>;
  }

  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento neste arquivo ainda.</p>;
  }

  return (
    <div className="document-list" aria-busy={isLoading}>
      {documents.map((document) => (
        <article className="document-row" key={document.id}>
          <div className="document-symbol" aria-hidden="true">DOC</div>
          <div className="document-details">
            <h3>{document.originalName}</h3>
            <p>{formatSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}</p>
          </div>
          <button
            type="button"
            className="download-button"
            onClick={() => onDownload(document)}
            disabled={downloadingId === document.id}
          >
            {downloadingId === document.id ? 'Baixando...' : 'Baixar'}
          </button>
        </article>
      ))}
    </div>
  );
}