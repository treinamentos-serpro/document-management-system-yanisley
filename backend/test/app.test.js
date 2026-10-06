const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const uploadDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.UPLOAD_DIR = uploadDirectory;
process.env.UPLOAD_MAX_SIZE_BYTES = '1024';
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(uploadDirectory, { recursive: true, force: true });
});

function createForm(content, filename = 'relatorio.txt') {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), filename);
  return form;
}

async function uploadAs(owner, filename) {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: createForm(filename, filename)
  });

  assert.equal(response.status, 201);
  return (await response.json()).document;
}

async function assertApiError(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);

  const body = await response.json();
  assert.equal(body.error.code, code);
  assert.equal(typeof body.error.message, 'string');
  assert.ok(body.error.message.length > 0);
  return body.error;
}

test('o app exporta o servidor Express e responde ao health check', async () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');

  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('faz upload, lista por usuário e baixa somente para o dono', async () => {
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: createForm('conteudo local')
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'relatorio.txt');
  assert.equal(document.owner, 'alice');
  assert.equal(document.size, Buffer.byteLength('conteudo local'));
  assert.equal(document.contentType, 'text/plain');
  assert.equal(Number.isNaN(Date.parse(document.uploadedAt)), false);
  assert.equal('storageName' in document, false);

  const storedFiles = fs.readdirSync(uploadDirectory);
  assert.equal(storedFiles.length, 1);
  assert.notEqual(storedFiles[0], document.originalName);
  assert.equal(fs.statSync(path.join(uploadDirectory, storedFiles[0])).size, document.size);

  const ownDocuments = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'alice' }
  });
  assert.equal(ownDocuments.status, 200);
  const ownDocumentList = await ownDocuments.json();
  assert.deepEqual(ownDocumentList.documents.map(({ id }) => id), [document.id]);
  assert.equal(ownDocumentList.documents[0].owner, 'alice');

  const otherDocuments = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'bob' }
  });
  assert.deepEqual((await otherDocuments.json()).documents, []);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' }
  });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'conteudo local');
  assert.equal(download.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.match(download.headers.get('content-disposition'), /relatorio\.txt/);

  const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'bob' }
  });
  await assertApiError(forbiddenDownload, 404, 'DOCUMENT_NOT_FOUND');

  const missingDocument = await fetch(`${baseUrl}/documents/unknown/download`, {
    headers: { 'X-User-Id': 'alice' }
  });
  await assertApiError(missingDocument, 404, 'DOCUMENT_NOT_FOUND');

  fs.unlinkSync(path.join(uploadDirectory, fs.readdirSync(uploadDirectory)[0]));
  const missingFile = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' }
  });
  await assertApiError(missingFile, 404, 'FILE_NOT_FOUND');
});

test('valida usuário, arquivo obrigatório e limite de tamanho', async () => {
  const missingOwner = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createForm('conteudo')
  });
  await assertApiError(missingOwner, 400, 'INVALID_USER');

  const blankOwner = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': '   ' }
  });
  await assertApiError(blankOwner, 400, 'INVALID_USER');

  const oversizedOwner = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'u'.repeat(101) }
  });
  await assertApiError(oversizedOwner, 400, 'INVALID_USER');

  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: new FormData()
  });
  await assertApiError(missingFile, 400, 'FILE_REQUIRED');

  const oversized = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: createForm('x'.repeat(1025), 'grande.txt')
  });
  await assertApiError(oversized, 413, 'FILE_TOO_LARGE');
});

test('exige usuário nas rotas de listagem e download', async () => {
  const listWithoutOwner = await fetch(`${baseUrl}/documents`);
  await assertApiError(listWithoutOwner, 400, 'INVALID_USER');

  const downloadWithoutOwner = await fetch(`${baseUrl}/documents/unknown/download`);
  await assertApiError(downloadWithoutOwner, 400, 'INVALID_USER');
});

test('rejeita campos inesperados e mais de um arquivo', async () => {
  const unexpectedFieldForm = new FormData();
  unexpectedFieldForm.append('document', new Blob(['conteudo']), 'documento.txt');
  const unexpectedField = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: unexpectedFieldForm
  });
  await assertApiError(unexpectedField, 400, 'UPLOAD_FAILED');

  const multipleFilesForm = createForm('primeiro');
  multipleFilesForm.append('file', new Blob(['segundo']), 'segundo.txt');
  const multipleFiles = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: multipleFilesForm
  });
  await assertApiError(multipleFiles, 400, 'UPLOAD_FAILED');
  assert.deepEqual(fs.readdirSync(uploadDirectory), []);
});

test('retorna erro controlado quando o arquivo não pode ser aberto para download', async () => {
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: createForm('conteudo', 'download-error.txt')
  });
  const { document } = await uploadResponse.json();
  const filePath = path.join(uploadDirectory, fs.readdirSync(uploadDirectory)[0]);

  fs.unlinkSync(filePath);
  fs.mkdirSync(filePath);
  const failedDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' }
  });
  await assertApiError(failedDownload, 500, 'DOWNLOAD_FAILED');
  fs.rmSync(filePath, { recursive: true, force: true });
});

test('retorna erro genérico quando o diretório de armazenamento falha', async () => {
  const backupDirectory = `${uploadDirectory}-backup`;
  fs.renameSync(uploadDirectory, backupDirectory);
  fs.writeFileSync(uploadDirectory, 'bloqueio');

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const failedUpload = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'alice' },
      body: createForm('conteudo')
    });
    await assertApiError(failedUpload, 500, 'INTERNAL_ERROR');
  } finally {
    console.error = originalConsoleError;
    fs.rmSync(uploadDirectory, { recursive: true, force: true });
    fs.renameSync(backupDirectory, uploadDirectory);
  }
});

test('lista documentos do mais recente ao mais antigo', async () => {
  const owner = 'sorting-user';
  const first = await uploadAs(owner, 'primeiro.txt');
  await new Promise((resolve) => setTimeout(resolve, 15));
  const second = await uploadAs(owner, 'segundo.txt');

  const response = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner }
  });
  const { documents } = await response.json();

  assert.deepEqual(
    documents.map(({ id }) => id),
    [second.id, first.id]
  );
});
