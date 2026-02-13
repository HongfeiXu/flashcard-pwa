// db.js - IndexedDB CRUD 封装

const DB_NAME = 'FlashcardDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

let _db = null;
let _dbUnavailable = false;
let _dbRetried = false; // 允许失败后重试一次

function openDB() {
  if (_db) return Promise.resolve(_db);
  // 如果之前失败过但还没重试，允许再试一次
  if (_dbUnavailable) {
    if (_dbRetried) return Promise.reject(new Error('DB_UNAVAILABLE'));
    _dbRetried = true;
    _dbUnavailable = false;
  }
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
        _dbRetried = false; // 成功后重置重试标志
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

function clearAll() {
  return _tx('readwrite').then(store => new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function bulkImport(cards) {
  // 在一个 readwrite 事务中批量 put，避免每条一个事务
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const card of cards) {
      store.put(card);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      const err = tx.error;
      if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        reject(new Error('STORAGE_FULL'));
      } else {
        reject(err);
      }
    };
    tx.onabort = () => {
      const err = tx.error;
      if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        reject(new Error('STORAGE_FULL'));
      } else {
        reject(err || new Error('DB_UNAVAILABLE'));
      }
    };
  }));
}

export { openDB, getAllCards, getCard, addCard, putCard, deleteCard, clearAll, bulkImport };
