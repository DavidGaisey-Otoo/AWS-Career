const DB_NAME = 'aws-career-document-vault';
const DB_VERSION = 1;
const STORE = 'documents';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('category', 'category');
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listVaultDocuments() {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const items = await requestResult(tx.objectStore(STORE).getAll());
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } finally {
    db.close();
  }
}

export async function saveVaultDocument({ file, title, category, documentType, notes }) {
  const db = await openDb();
  const item = {
    id: crypto.randomUUID(),
    title: title.trim() || file.name,
    category,
    documentType,
    notes: notes.trim(),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestResult(tx.objectStore(STORE).put(item));
    return item;
  } finally {
    db.close();
  }
}

export async function deleteVaultDocument(id) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestResult(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export function downloadVaultDocument(item) {
  const url = URL.createObjectURL(item.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = item.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

