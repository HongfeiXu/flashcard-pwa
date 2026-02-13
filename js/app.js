// app.js - 主逻辑

import { getAllCards, getCard, addCard, putCard, deleteCard, clearAll, bulkImport } from './db.js';
import { generateCard, getApiKey, getCachedCard, setCachedCard } from './api.js';
import { speak } from './tts.js';

// --- HTML 转义，防止 XSS（正则版，避免重复创建 DOM 元素）---
const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const _escRe = /[&<>"']/g;
function esc(s) {
  if (!s) return '';
  return String(s).replace(_escRe, c => _escMap[c]);
}

// --- 统一错误信息映射 ---
const ERROR_MESSAGES = {
  DB_UNAVAILABLE: '无法访问本地存储。如果你正在使用隐私/无痕模式，请切换到正常浏览模式后重试。',
  STORAGE_FULL: '设备存储空间不足，请清理后重试。',
  NETWORK: '网络连接失败，请检查网络后重试',
  NOT_FOUND: '暂无词汇数据（vocab.json 不存在）',
  SERVER: '服务器错误，请稍后重试',
  PARSE: '词汇数据格式异常',
};

function friendlyError(err) {
  if (!err) return '操作失败，请稍后重试';
  return ERROR_MESSAGES[err.message] || err.message || '操作失败，请稍后重试';
}

// --- Toast 提示（替代 alert）---
function showToast(msg, type = 'error') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    document.body.prepend(toast);
  }
  toast.textContent = msg;
  toast.className = `global-toast show ${type === 'success' ? 'toast-success' : ''}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.className = 'global-toast', 4000);
}

// 兼容旧调用
function showGlobalError(msg) { showToast(msg, 'error'); }

// --- SW 注册 + 更新提示（用 banner 替代 confirm）---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    showUpdateBanner();
  });
}

function showUpdateBanner() {
  let banner = document.getElementById('update-banner');
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.className = 'update-banner show';
  banner.innerHTML = '应用已更新 <button id="btn-update-reload">刷新</button> <button id="btn-update-dismiss">稍后</button>';
  document.body.appendChild(banner);
  document.getElementById('btn-update-reload').onclick = () => location.reload();
  document.getElementById('btn-update-dismiss').onclick = () => banner.remove();
}

// --- iOS Safari 键盘适配（旋转后更新基准高度）---
const tabBar = document.querySelector('.tab-bar');
if (window.visualViewport) {
  let originalHeight = window.innerHeight;
  // 旋转或 resize 后更新基准高度（全屏态，无键盘）
  window.addEventListener('orientationchange', () => {
    setTimeout(() => { originalHeight = window.innerHeight; }, 200);
  });
  window.visualViewport.addEventListener('resize', () => {
    const vv = window.visualViewport;
    // 键盘弹出时 viewport 高度显著缩小
    const keyboardOpen = vv.height < originalHeight * 0.75;
    if (tabBar) tabBar.style.display = keyboardOpen ? 'none' : 'flex';
    // 键盘收起时更新基准（此时 vv.height ≈ 全屏高度）
    if (!keyboardOpen) originalHeight = vv.height;
  });
}

// --- Tab 切换 ---
const tabs = document.querySelectorAll('.tab-btn');
const pages = document.querySelectorAll('.page');

function switchTab(id) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === id));
  pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
  if (id === 'review') initReview();
  if (id === 'library') renderLibrary();
}

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// --- 复习页 ---
let reviewQueue = [];
let reviewStats = { total: 0, known: 0, unknown: 0 };
let currentCard = null;
let isFlipped = false;

const reviewArea = document.getElementById('review-area');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function initReview() {
  try {
    const all = await getAllCards();
    const pending = all.filter(c => !c.mastered);
    if (pending.length === 0) {
      reviewArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>${all.length === 0 ? '词库为空，去添加第一个单词吧！' : '所有单词都已掌握！🎉'}</p>
          <button class="btn btn-primary" onclick="document.querySelector('[data-tab=add]').click()">去添加</button>
        </div>`;
      return;
    }
    reviewQueue = shuffle([...pending]);
    reviewStats = { total: reviewQueue.length, known: 0, unknown: 0 };
    showCard();
  } catch (err) {
    reviewArea.innerHTML = `<div class="error-msg">${esc(friendlyError(err))}</div>`;
  }
}

function showCard() {
  if (reviewQueue.length === 0) {
    reviewArea.innerHTML = `
      <div class="review-done">
        <div class="done-icon">🎉</div>
        <h2>本轮复习完成！</h2>
        <div class="stats-grid">
          <div class="stat"><span class="stat-num">${reviewStats.total}</span><span class="stat-label">总数</span></div>
          <div class="stat"><span class="stat-num">${reviewStats.known}</span><span class="stat-label">认识</span></div>
          <div class="stat"><span class="stat-num">${reviewStats.unknown}</span><span class="stat-label">不认识</span></div>
        </div>
        <button class="btn btn-primary" id="btn-again">再来一轮</button>
      </div>`;
    document.getElementById('btn-again').onclick = initReview;
    return;
  }

  currentCard = reviewQueue[0];
  isFlipped = false;

  reviewArea.innerHTML = `
    <div class="progress-text">${reviewStats.total - reviewQueue.length + 1} / ${reviewStats.total}</div>
    <div class="card-container fade-in" id="card-flip">
      <div class="card">
        <div class="card-front">
          <div class="card-word">${esc(currentCard.word)}</div>
          <button class="btn-speak" id="btn-tts">🔊</button>
        </div>
        <div class="card-back">
          <div class="card-back-word">${esc(currentCard.word)}</div>
          <div class="card-phonetic">${esc(currentCard.phonetic)} <button class="btn-speak-inline" id="btn-tts-word-back">🔊</button></div>
          <div class="card-pos">${esc(currentCard.pos)}</div>
          <div class="card-def">${esc(currentCard.definition)}</div>
          <div class="card-example">${esc(currentCard.example)}${currentCard.example ? ' <button class="btn-speak-inline" id="btn-tts-example">🔊</button>' : ''}</div>
          <div class="card-example-cn">${esc(currentCard.example_cn)}</div>
        </div>
      </div>
    </div>
    <div class="review-actions" id="review-actions" style="display:none;">
      <button class="btn btn-danger" id="btn-unknown">❌ 不认识</button>
      <button class="btn btn-success" id="btn-known">✅ 认识</button>
    </div>`;

  document.getElementById('card-flip').onclick = () => {
    const el = document.getElementById('card-flip');
    if (!isFlipped) {
      el.classList.add('flipped');
      document.getElementById('review-actions').style.display = 'flex';
      isFlipped = true;
    } else {
      el.classList.remove('flipped');
      document.getElementById('review-actions').style.display = 'none';
      isFlipped = false;
    }
  };

  document.getElementById('btn-tts').onclick = (e) => { e.stopPropagation(); speak(currentCard.word); };
  document.getElementById('btn-tts-word-back').onclick = (e) => { e.stopPropagation(); speak(currentCard.word); };
  const ttsExample = document.getElementById('btn-tts-example');
  if (ttsExample) ttsExample.onclick = (e) => { e.stopPropagation(); speak(currentCard.example); };

  document.getElementById('btn-known').onclick = async () => {
    reviewQueue.shift();
    reviewStats.known++;
    currentCard.mastered = true;
    currentCard.correctCount = (currentCard.correctCount || 0) + 1;
    currentCard.lastReviewedAt = Date.now();
    try {
      await putCard(currentCard);
    } catch (err) {
      showGlobalError(friendlyError(err));
    }
    showCard();
  };

  document.getElementById('btn-unknown').onclick = async () => {
    const card = reviewQueue.shift();
    reviewStats.unknown++;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.lastReviewedAt = Date.now();
    try {
      await putCard(card);
    } catch (err) {
      showGlobalError(friendlyError(err));
    }
    reviewQueue.push(card);
    showCard();
  };
}

// --- 添加页 ---
const addInput = document.getElementById('add-input');
const addBtn = document.getElementById('add-btn');
const addResult = document.getElementById('add-result');
let isGenerating = false;

let previewWord = null;

// 输入验证：只允许英文字母、连字符、空格（多词短语）
function validateWord(input) {
  const word = input.trim().toLowerCase();
  if (!word) return { valid: false, msg: '请输入单词' };
  if (word.length > 50) return { valid: false, msg: '输入过长，请输入单个单词或短语' };
  if (!/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word)) return { valid: false, msg: '请输入有效的英文单词' };
  return { valid: true, word };
}

function showPreview(word, data) {
  const card = {
    word: (data.word || word).toLowerCase(),
    phonetic: data.phonetic || '',
    pos: data.pos || '',
    definition: data.definition || '',
    example: data.example || '',
    example_cn: data.example_cn || '',
    mastered: false,
    createdAt: Date.now(),
    reviewCount: 0,
    correctCount: 0,
    lastReviewedAt: null
  };

  addResult.innerHTML = `
    <div class="preview-card">
      <div class="preview-word">${esc(card.word)}</div>
      <div class="preview-phonetic">${esc(card.phonetic)} <button class="btn-speak-inline" id="btn-preview-tts-word">🔊</button></div>
      <div class="preview-pos">${esc(card.pos)}</div>
      <div class="preview-def">${esc(card.definition)}</div>
      <div class="preview-example">${esc(card.example)}${card.example ? ' <button class="btn-speak-inline" id="btn-preview-tts-example">🔊</button>' : ''}</div>
      <div class="preview-example-cn">${esc(card.example_cn)}</div>
    </div>
    <button class="btn btn-primary" id="btn-save">保存到词库</button>`;

  previewWord = word;
  isGenerating = false;
  addBtn.disabled = false;

  document.getElementById('btn-preview-tts-word').onclick = () => speak(card.word);
  const previewExBtn = document.getElementById('btn-preview-tts-example');
  if (previewExBtn) previewExBtn.onclick = () => speak(card.example);

  document.getElementById('btn-save').onclick = async () => {
    try {
      await addCard(card);
      previewWord = null;
      addResult.innerHTML = '<div class="success-msg">✅ 已保存！</div>';
      addInput.value = '';
      addInput.focus();
    } catch (e) {
      const msg = e.message === 'STORAGE_FULL'
        ? '设备存储空间不足，请清理后重试'
        : e.message === 'DB_UNAVAILABLE'
        ? '无法访问本地存储，请使用正常浏览模式'
        : '保存失败，请稍后重试';
      addResult.innerHTML = `<div class="error-msg">${msg}</div>`;
    }
  };
}

async function handleAdd() {
  const validation = validateWord(addInput.value);
  if (!validation.valid) {
    addResult.innerHTML = `<div class="error-msg">${esc(validation.msg)}</div>`;
    return;
  }
  const word = validation.word;
  if (isGenerating) return;

  if (previewWord === word && addResult.querySelector('#btn-save')) return;

  if (!getApiKey()) {
    addResult.innerHTML = '<div class="error-msg">请先在设置中输入 API Key</div>';
    return;
  }

  try {
    const existing = await getCard(word);
    if (existing) {
      addResult.innerHTML = '<div class="error-msg">该单词已在词库中</div>';
      return;
    }
  } catch (err) {
    addResult.innerHTML = `<div class="error-msg">${esc(friendlyError(err))}</div>`;
    return;
  }

  const cached = getCachedCard(word);
  if (cached) {
    showPreview(word, cached);
    return;
  }

  isGenerating = true;
  addBtn.disabled = true;
  addResult.innerHTML = '<div class="loading"><div class="spinner"></div><p>正在生成卡片...</p></div>';

  try {
    const data = await generateCard(word);
    setCachedCard(word, data);
    showPreview(word, data);
  } catch (err) {
    const msg = err.message === 'NO_API_KEY' ? '请先在设置中输入 API Key' : err.message;
    addResult.innerHTML = `<div class="error-msg">${esc(msg)}</div><button class="btn btn-primary" id="btn-retry">重试</button>`;
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.onclick = () => { isGenerating = false; addBtn.disabled = false; handleAdd(); };
    isGenerating = false;
    addBtn.disabled = false;
  }
}

addBtn.addEventListener('click', handleAdd);
addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdd(); });
addInput.addEventListener('input', () => {
  if (isGenerating && !addBtn.disabled) return;
  if (addBtn.disabled && addResult.querySelector('#btn-save')) {
    isGenerating = false;
    addBtn.disabled = false;
  }
});

// --- 经济学人词汇同步 ---
function getVocabUrl() {
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.')) return '/vocab.json';
  return 'https://hongfeixu.github.io/flashcard-pwa/vocab.json';
}

function updateSyncTime() {
  const el = document.getElementById('sync-time');
  const ts = localStorage.getItem('lastVocabSync');
  if (ts) {
    const d = new Date(Number(ts));
    el.textContent = `上次同步：${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  } else {
    el.textContent = '';
  }
}

document.getElementById('btn-sync-vocab').addEventListener('click', async function() {
  const btn = this;
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '⏳ 同步中...';

  try {
    let resp;
    try {
      resp = await fetch(getVocabUrl(), { cache: 'no-cache' });
    } catch (e) {
      throw new Error('NETWORK');
    }
    if (!resp.ok) {
      if (resp.status === 404) throw new Error('NOT_FOUND');
      throw new Error('SERVER');
    }
    let vocabList;
    try {
      vocabList = await resp.json();
    } catch (e) {
      throw new Error('PARSE');
    }
    if (!Array.isArray(vocabList)) throw new Error('PARSE');

    // 先获取已有单词（统一小写比较），过滤出需要新增的
    const existingCards = await getAllCards();
    const existingWords = new Set(existingCards.map(c => c.word.toLowerCase()));
    const newCards = [];
    let skipped = 0;
    for (const item of vocabList) {
      if (!item.word) continue;
      const w = item.word.toLowerCase();
      if (existingWords.has(w)) { skipped++; continue; }
      existingWords.add(w); // 防止同一批次内重复
      newCards.push({
        word: w,
        phonetic: item.phonetic || '',
        pos: item.pos || '',
        definition: item.definition || '',
        example: item.example || '',
        example_cn: item.example_cn || '',
        mastered: false,
        createdAt: Date.now(),
        reviewCount: 0,
        correctCount: 0,
        lastReviewedAt: null
      });
    }
    if (newCards.length > 0) {
      await bulkImport(newCards);
    }
    localStorage.setItem('lastVocabSync', String(Date.now()));
    updateSyncTime();
    showToast(`新增 ${newCards.length} 个单词，跳过 ${skipped} 个已存在`, 'success');
    renderLibrary();
  } catch (e) {
    showToast('同步失败：' + friendlyError(e));
  } finally {
    btn.disabled = false;
    btn.textContent = '📰 同步经济学人词汇';
  }
});

// --- 词库页 ---
const libraryList = document.getElementById('library-list');
const libraryStats = document.getElementById('library-stats');

async function renderLibrary() {
  try {
    const all = await getAllCards();
    const mastered = all.filter(c => c.mastered).length;
    const pending = all.length - mastered;
    libraryStats.textContent = `共 ${all.length} 个单词，已掌握 ${mastered}，待复习 ${pending}`;
    updateSyncTime();

    if (all.length === 0) {
      libraryList.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>词库为空</p></div>';
      return;
    }

    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 使用 DocumentFragment 一次性挂载，避免大词库逐个插入卡顿
    const frag = document.createDocumentFragment();
    for (const c of all) {
      const item = document.createElement('div');
      item.className = 'lib-item';
      item.dataset.word = c.word;
      item.innerHTML = `
        <div class="lib-row">
          <span class="lib-word">${esc(c.word)}</span>
          <span class="lib-def">${esc(c.definition)}</span>
          <span class="lib-badge ${c.mastered ? 'badge-mastered' : 'badge-pending'}">${c.mastered ? '已掌握' : '待复习'}</span>
        </div>
        <div class="lib-detail" style="display:none;">
          <p>${esc(c.phonetic)} ${esc(c.pos)} <button class="btn-speak btn-speak-lib">🔊</button></p>
          <p>${esc(c.example)}${c.example ? ' <button class="btn-speak-inline btn-speak-example">🔊</button>' : ''}</p>
          <p class="text-muted">${esc(c.example_cn)}</p>
          <div class="lib-actions">
            <button class="btn btn-sm btn-toggle">${c.mastered ? '标为待复习' : '标为已掌握'}</button>
            <button class="btn btn-sm btn-delete">删除</button>
          </div>
        </div>`;

      const word = c.word;
      const detail = item.querySelector('.lib-detail');
      item.querySelector('.lib-row').onclick = () => {
        detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
      };
      item.querySelector('.btn-speak-lib').onclick = (e) => {
        e.stopPropagation();
        speak(word);
      };
      const exBtn = item.querySelector('.btn-speak-example');
      if (exBtn) {
        exBtn.onclick = (e) => { e.stopPropagation(); speak(c.example); };
      }
      item.querySelector('.btn-toggle').onclick = async (e) => {
        e.stopPropagation();
        try {
          const card = await getCard(word);
          card.mastered = !card.mastered;
          await putCard(card);
          renderLibrary();
        } catch (err) {
          showGlobalError(friendlyError(err));
        }
      };
      item.querySelector('.btn-delete').onclick = (e) => {
        e.stopPropagation();
        showConfirmDialog(`确定删除 "${esc(word)}"？`, async () => {
          try {
            await deleteCard(word);
            renderLibrary();
          } catch (err) {
            showGlobalError(friendlyError(err));
          }
        });
      };
      frag.appendChild(item);
    }
    libraryList.innerHTML = '';
    libraryList.appendChild(frag);
  } catch (err) {
    libraryList.innerHTML = `<div class="error-msg">${esc(friendlyError(err))}</div>`;
  }
}

// --- 设置页 ---
document.getElementById('btn-settings').addEventListener('click', async () => {
  document.getElementById('page-library').classList.remove('active');
  document.getElementById('page-settings').classList.add('active');
  const keyInput = document.getElementById('settings-apikey');
  keyInput.value = localStorage.getItem('minimax_api_key') || '';
  document.getElementById('settings-model').value = localStorage.getItem('minimax_model') || 'MiniMax-M2.1-lightning';
  await updateSettingsStats();
});

async function updateSettingsStats() {
  try {
    const all = await getAllCards();
    const mastered = all.filter(c => c.mastered).length;
    const pending = all.length - mastered;
    document.getElementById('settings-stats').textContent = `共 ${all.length} 个单词，已掌握 ${mastered}，待复习 ${pending}`;
  } catch (err) {
    document.getElementById('settings-stats').textContent = friendlyError(err);
  }
}

document.getElementById('btn-settings-back').addEventListener('click', () => {
  document.getElementById('page-settings').classList.remove('active');
  document.getElementById('page-library').classList.add('active');
  renderLibrary();
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const key = document.getElementById('settings-apikey').value.trim();
  const model = document.getElementById('settings-model').value;
  if (key) localStorage.setItem('minimax_api_key', key);
  localStorage.setItem('minimax_model', model);
  showToast('设置已保存', 'success');
});

document.getElementById('toggle-key-vis').addEventListener('click', () => {
  const inp = document.getElementById('settings-apikey');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// --- 导出词库 ---
document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    const all = await getAllCards();
    const json = JSON.stringify(all, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('导出失败：' + friendlyError(err));
  }
});

// --- 导入词库 ---
document.getElementById('btn-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    let cards;
    try {
      cards = JSON.parse(text);
    } catch {
      throw new Error('文件格式错误，请选择有效的 JSON 文件');
    }
    if (!Array.isArray(cards)) throw new Error('文件格式错误：期望数组格式');

    // 先获取已有单词（统一小写比较），过滤出需要导入的
    const existingCards = await getAllCards();
    const existingWords = new Set(existingCards.map(c => c.word.toLowerCase()));
    const newCards = [];
    let skipped = 0;
    for (const card of cards) {
      if (!card.word) continue;
      const w = card.word.toLowerCase();
      if (existingWords.has(w)) { skipped++; continue; }
      existingWords.add(w); // 防止同一批次内重复
      newCards.push({
        word: w,
        phonetic: card.phonetic || '',
        pos: card.pos || '',
        definition: card.definition || '',
        example: card.example || '',
        example_cn: card.example_cn || '',
        mastered: card.mastered || false,
        createdAt: card.createdAt || Date.now(),
        reviewCount: card.reviewCount || 0,
        correctCount: card.correctCount || 0,
        lastReviewedAt: card.lastReviewedAt || null
      });
    }
    if (newCards.length > 0) {
      await bulkImport(newCards);
    }
    showToast(`导入完成！新增 ${newCards.length} 个，跳过 ${skipped} 个已存在`, 'success');
    await updateSettingsStats();
  } catch (err) {
    showToast('导入失败：' + (err.message || '请稍后重试'));
  }
  e.target.value = '';
});

// --- 清空词库（保留设置）---
document.getElementById('btn-clear-vocab').addEventListener('click', async () => {
  showConfirmDialog('确定要清空词库吗？所有单词将被删除，但 API Key 和设置会保留。', async () => {
    try {
      await clearAll();
      localStorage.removeItem('card_cache');
      localStorage.removeItem('lastVocabSync');
      showToast('词库已清空', 'success');
      await updateSettingsStats();
    } catch (err) {
      showToast('清空失败：' + friendlyError(err));
    }
  });
});

// --- 重置应用（含设置）---
document.getElementById('btn-clear-all').addEventListener('click', async () => {
  showConfirmDialog('⚠️ 确定要重置应用吗？所有数据（含 API Key）都将删除！', async () => {
    try {
      await clearAll();
      localStorage.removeItem('minimax_api_key');
      localStorage.removeItem('minimax_model');
      localStorage.removeItem('card_cache');
      localStorage.removeItem('lastVocabSync');
      showToast('所有数据已清空', 'success');
      await updateSettingsStats();
    } catch (err) {
      showToast('重置失败：' + friendlyError(err));
    }
  });
});

// --- 自定义确认对话框（替代 confirm，PWA 模式更友好）---
function showConfirmDialog(msg, onConfirm) {
  // 移除已有的对话框
  const existing = document.getElementById('confirm-dialog-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-dialog-overlay';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <p class="confirm-msg">${msg}</p>
      <div class="confirm-actions">
        <button class="btn btn-sm confirm-cancel">取消</button>
        <button class="btn btn-sm btn-danger confirm-ok">确定</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('.confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// --- 初始化 ---
switchTab('review');
