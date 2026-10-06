const fs = require('node:fs');
const path = require('node:path');
const { uploadDirectory } = require('../config/storage');

const documents = new Map();

function create(document) {
  documents.set(document.id, { ...document });
  return { ...document };
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

function listByOwner(owner) {
  return Array.from(documents.values())
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map((document) => ({ ...document }));
}

function getFilePath(document) {
  return path.join(uploadDirectory, document.storageName);
}

function fileExists(document) {
  return fs.existsSync(getFilePath(document));
}

module.exports = { create, findById, listByOwner, getFilePath, fileExists };