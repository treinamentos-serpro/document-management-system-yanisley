import { useState } from 'react';

export default function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile || isUploading) return;

    const form = event.currentTarget;
    const uploaded = await onUpload(selectedFile);
    if (uploaded) {
      setSelectedFile(null);
      form.reset();
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker" htmlFor="document-file">
        <span className="file-picker-icon" aria-hidden="true">+</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? selectedFile.name : 'Escolher um arquivo'}</strong>
          <span>{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Qualquer formato · até 10 MiB'}</span>
        </span>
        <input
          id="document-file"
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          disabled={isUploading}
        />
      </label>
      <button className="primary-button" type="submit" disabled={!selectedFile || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}