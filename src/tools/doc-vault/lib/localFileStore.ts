/**
 * IndexedDB-backed local file store.
 * Files are stored as Blobs keyed by their storage path.
 * This is a temporary solution while cloud storage is unavailable.
 */

const DB_NAME = 'doc_vault_files';
const DB_VERSION = 1;
const STORE = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE); // key = storagePath
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(path: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, path);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(path: string): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(path);
    req.onsuccess = () => resolve((req.result as File) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(path: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(path);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns true if the downloadURL points to a local IndexedDB file. */
export function isLocalURL(url: string): boolean {
  return url.startsWith('local:');
}

/** Extracts the storage path from a local: URL. */
export function pathFromLocalURL(url: string): string {
  return url.slice('local:'.length);
}

/** Triggers a browser download for a locally stored file. */
export async function downloadLocalFile(url: string, filename: string): Promise<void> {
  const path = pathFromLocalURL(url);
  const file = await getFile(path);
  if (!file) throw new Error('File không tìm thấy trên thiết bị này.');
  const blobUrl = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
