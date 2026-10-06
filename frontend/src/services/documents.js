const API_BASE = '/api';

async function readError(response) {
  try {
    const body = await response.json();
    return body.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function checkResponse(response) {
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return response;
}

export async function listDocuments(owner) {
  const response = await fetch(`${API_BASE}/documents`, {
    headers: { 'X-User-Id': owner }
  }).then(checkResponse);
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(owner, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: formData
  }).then(checkResponse);
  return response.json();
}

export async function downloadDocument(owner, id) {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/download`, {
    headers: { 'X-User-Id': owner }
  }).then(checkResponse);
  return response.blob();
}