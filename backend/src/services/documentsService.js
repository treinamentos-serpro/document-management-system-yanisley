const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documentsRepository');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function createDocument(file, owner) {
  const document = documentsRepository.create({
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    contentType: file.mimetype || 'application/octet-stream',
    storageName: file.filename
  });

  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentsRepository.listByOwner(owner).map(toPublicDocument);
}

function getDownload(owner, id) {
  const document = documentsRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  if (!documentsRepository.fileExists(document)) {
    return { fileMissing: true };
  }

  return {
    document: toPublicDocument(document),
    filePath: documentsRepository.getFilePath(document)
  };
}

module.exports = { createDocument, listDocuments, getDownload };