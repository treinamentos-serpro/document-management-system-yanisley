const documentsService = require('../services/documentsService');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner || owner.length > 100) {
    return res.status(400).json({
      error: {
        code: 'INVALID_USER',
        message: 'Informe um identificador de usuário válido no cabeçalho X-User-Id.'
      }
    });
  }

  req.owner = owner;
  return next();
}

function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: 'Envie um arquivo no campo file.'
      }
    });
  }

  const document = documentsService.createDocument(req.file, req.owner);
  return res.status(201).json({ document });
}

function listDocuments(req, res) {
  return res.json({ documents: documentsService.listDocuments(req.owner) });
}

function downloadDocument(req, res) {
  const download = documentsService.getDownload(req.owner, req.params.id);
  if (!download) {
    return res.status(404).json({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Documento não encontrado.'
      }
    });
  }

  if (download.fileMissing) {
    return res.status(404).json({
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'O arquivo associado ao documento não foi encontrado.'
      }
    });
  }

  res.type(download.document.contentType);
  return res.download(download.filePath, download.document.originalName, (error) => {
    if (error && !res.headersSent) {
      res.type('application/json');
      res.status(500).json({
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Não foi possível baixar o documento.'
        }
      });
    }
  });
}

module.exports = { requireOwner, uploadDocument, listDocuments, downloadDocument };