// db.js - IndexedDB CRUD 封装

const DB_NAME = 'FlashcardDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
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
    req.onerror = (e) => reject(e.target.error);
  });
}

function _tx(mode) {
  return openDB().then(db => {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  });
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
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.add(card);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function putCard(card) {
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.put(card);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function deleteCard(word) {
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.delete(word);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

export { openDB, getAllCards, getCard, addCard, putCard, deleteCard };
