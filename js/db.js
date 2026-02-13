// db.js - IndexedDB CRUD 封装

const DB_NAME = 'FlashcardDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let _db = null;
let _dbUnavailable = false;

function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbUnavailable) return Promise.reject(new Error('DB_UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'word' });
        }
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => {
        _dbUnavailable = true;
        reject(new Error('DB_UNAVAILABLE'));
      };
    } catch (e) {
      _dbUnavailable = true;
      reject(new Error('DB_UNAVAILABLE'));
    }
  });
}

function _tx(mode) {
  return openDB().then(db => {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  });
}

function _wrapWrite(storeFn) {
  // Wraps a write operation to catch QuotaExceededError
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = storeFn(store);
    req.onsuccess = () => resolve();
    req.onerror = () => {
      const err = req.error;
      if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        reject(new Error('STORAGE_FULL'));
      } else {
        reject(err);
      }
    };
  }));
}

function getAllCards() {
  return _tx('readonly').then(store => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function getCard(word) {
  return _tx('readonly').then(store => new Promise((resolve, reject) => {
    const req = store.get(word);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function addCard(card) {
  return _wrapWrite(store => store.add(card));
}

function putCard(card) {
  return _wrapWrite(store => store.put(card));
}

function deleteCard(word) {
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(word);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

export { openDB, getAllCards, getCard, addCard, putCard, deleteCard };
