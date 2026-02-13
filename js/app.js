// app.js - 主逻辑

import { getAllCards, getCard, addCard, putCard, deleteCard } from './db.js';
import { generateCard, getApiKey, getCachedCard, setCachedCard } from './api.js';
import { speak } from './tts.js';

// --- SW 注册 ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
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
          <div class="card-word">${currentCard.word}</div>
          <button class="btn-speak" id="btn-tts">🔊</button>
        </div>
        <div class="card-back">
          <div class="card-phonetic">${currentCard.phonetic || ''}</div>
          <div class="card-pos">${currentCard.pos || ''}</div>
          <div class="card-def">${currentCard.definition || ''}</div>
          <div class="card-example">${currentCard.example || ''}${currentCard.example ? ' <button class="btn-speak-inline" id="btn-tts-example">🔊</button>' : ''}</div>
          <div class="card-example-cn">${currentCard.example_cn || ''}</div>
        </div>
      </div>
    </div>
    <div class="review-actions" id="review-actions" style="display:none;">
      <button class="btn btn-danger" id="btn-unknown">❌ 不认识</button>
      <button class="btn btn-success" id="btn-known">✅ 认识</button>
    </div>`;

  document.getElementById('card-flip').onclick = () => {
    if (!isFlipped) {
      document.getElementById('card-flip').classList.add('flipped');
      document.getElementById('review-actions').style.display = 'flex';
      isFlipped = true;
    }
  };

  document.getElementById('btn-tts').onclick = (e) => { e.stopPropagation(); speak(currentCard.word); };
  const ttsExample = document.getElementById('btn-tts-example');
  if (ttsExample) ttsExample.onclick = (e) => { e.stopPropagation(); speak(currentCard.example); };

  document.getElementById('btn-known').onclick = async () => {
    reviewQueue.shift();
    reviewStats.known++;
    currentCard.mastered = true;
    currentCard.correctCount = (currentCard.correctCount || 0) + 1;
    currentCard.lastReviewedAt = Date.now();
    await putCard(currentCard);
    showCard();
  };

  document.getElementById('btn-unknown').onclick = async () => {
    const card = reviewQueue.shift();
    reviewStats.unknown++;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.lastReviewedAt = Date.now();
    await putCard(card);
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

function showPreview(word, data) {
  const card = {
    word: data.word || word,
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
      <div class="preview-word">${card.word}</div>
      <div class="preview-phonetic">${card.phonetic}</div>
      <div class="preview-pos">${card.pos}</div>
      <div class="preview-def">${card.definition}</div>
      <div class="preview-example">${card.example}</div>
      <div class="preview-example-cn">${card.example_cn}</div>
    </div>
    <button class="btn btn-primary" id="btn-save">保存到词库</button>`;

  previewWord = word;
  isGenerating = false;
  addBtn.disabled = false;

  document.getElementById('btn-save').onclick = async () => {
    try {
      await addCard(card);
      previewWord = null;
      addResult.innerHTML = '<div class="success-msg">✅ 已保存！</div>';
      addInput.value = '';
      addInput.focus();
    } catch (e) {
      addResult.innerHTML = '<div class="error-msg">保存失败：' + e.message + '</div>';
    }
  };
}

async function handleAdd() {
  const word = addInput.value.trim().toLowerCase();
  if (!word || isGenerating) return;

  if (previewWord === word && addResult.querySelector('#btn-save')) return;

  if (!getApiKey()) {
    addResult.innerHTML = '<div class="error-msg">请先在设置中输入 API Key</div>';
    return;
  }

  const existing = await getCard(word);
  if (existing) {
    addResult.innerHTML = '<div class="error-msg">该单词已在词库中</div>';
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
    addResult.innerHTML = `<div class="error-msg">${msg}</div><button class="btn btn-primary" id="btn-retry">重试</button>`;
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
    const resp = await fetch(getVocabUrl(), { cache: 'no-cache' });
    if (!resp.ok) throw new Error('fetch failed');
    const vocabList = await resp.json();
    if (!Array.isArray(vocabList)) throw new Error('格式错误');

    let added = 0, skipped = 0;
    for (const item of vocabList) {
      if (!item.word) continue;
      const existing = await getCard(item.word.toLowerCase());
      if (existing) { skipped++; continue; }
      await addCard({
        word: item.word.toLowerCase(),
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
      added++;
    }
    localStorage.setItem('lastVocabSync', String(Date.now()));
    updateSyncTime();
    alert(`新增 ${added} 个单词，跳过 ${skipped} 个已存在`);
    renderLibrary();
  } catch (e) {
    alert('同步失败：暂无词汇数据或网络错误');
  } finally {
    btn.disabled = false;
    btn.textContent = '📰 同步经济学人词汇';
  }
});

// --- 词库页 ---
const libraryList = document.getElementById('library-list');
const libraryStats = document.getElementById('library-stats');

async function renderLibrary() {
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

  libraryList.innerHTML = all.map(c => `
    <div class="lib-item" data-word="${c.word}">
      <div class="lib-row">
        <span class="lib-word">${c.word}</span>
        <span class="lib-def">${c.definition}</span>
        <span class="lib-badge ${c.mastered ? 'badge-mastered' : 'badge-pending'}">${c.mastered ? '已掌握' : '待复习'}</span>
      </div>
      <div class="lib-detail" style="display:none;">
        <p>${c.phonetic || ''} ${c.pos || ''} <button class="btn-speak btn-speak-lib">🔊</button></p>
        <p>${c.example || ''}${c.example ? ' <button class="btn-speak-inline btn-speak-example">🔊</button>' : ''}</p>
        <p class="text-muted">${c.example_cn || ''}</p>
        <div class="lib-actions">
          <button class="btn btn-sm btn-toggle">${c.mastered ? '标为待复习' : '标为已掌握'}</button>
          <button class="btn btn-sm btn-delete">删除</button>
        </div>
      </div>
    </div>`).join('');

  libraryList.querySelectorAll('.lib-item').forEach(item => {
    const word = item.dataset.word;
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
      const card = all.find(c => c.word === word);
      exBtn.onclick = (e) => { e.stopPropagation(); speak(card.example); };
    }
    item.querySelector('.btn-toggle').onclick = async (e) => {
      e.stopPropagation();
      const card = await getCard(word);
      card.mastered = !card.mastered;
      await putCard(card);
      renderLibrary();
    };
    item.querySelector('.btn-delete').onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`确定删除 "${word}"？`)) {
        await deleteCard(word);
        renderLibrary();
      }
    };
  });
}

// --- 设置页 ---
document.getElementById('btn-settings').addEventListener('click', async () => {
  document.getElementById('page-library').classList.remove('active');
  document.getElementById('page-settings').classList.add('active');
  const keyInput = document.getElementById('settings-apikey');
  keyInput.value = localStorage.getItem('minimax_api_key') || '';
  document.getElementById('settings-model').value = localStorage.getItem('minimax_model') || 'MiniMax-M2.1-lightning';
  // Load stats
  await updateSettingsStats();
});

async function updateSettingsStats() {
  const all = await getAllCards();
  const mastered = all.filter(c => c.mastered).length;
  const pending = all.length - mastered;
  document.getElementById('settings-stats').textContent = `共 ${all.length} 个单词，已掌握 ${mastered}，待复习 ${pending}`;
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
  alert('设置已保存');
});

document.getElementById('toggle-key-vis').addEventListener('click', () => {
  const inp = document.getElementById('settings-apikey');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// --- 导出词库 ---
document.getElementById('btn-export').addEventListener('click', async () => {
  const all = await getAllCards();
  const json = JSON.stringify(all, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flashcard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// --- 导入词库 ---
document.getElementById('btn-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const cards = JSON.parse(text);
    if (!Array.isArray(cards)) throw new Error('格式错误：期望数组');
    let imported = 0, skipped = 0;
    for (const card of cards) {
      if (!card.word) continue;
      const existing = await getCard(card.word);
      if (existing) { skipped++; continue; }
      await addCard({
        word: card.word,
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
      imported++;
    }
    alert(`导入完成！新增 ${imported} 个，跳过 ${skipped} 个已存在的单词。`);
    await updateSettingsStats();
  } catch (err) {
    alert('导入失败：' + err.message);
  }
  e.target.value = '';
});

// --- 清空词库（保留设置）---
document.getElementById('btn-clear-vocab').addEventListener('click', async () => {
  if (!confirm('确定要清空词库吗？所有单词将被删除，但 API Key 和设置会保留。')) return;
  const all = await getAllCards();
  for (const card of all) {
    await deleteCard(card.word);
  }
  localStorage.removeItem('card_cache');
  localStorage.removeItem('lastVocabSync');
  alert(`已清空 ${all.length} 个单词`);
  await updateSettingsStats();
});

// --- 重置应用（含设置）---
document.getElementById('btn-clear-all').addEventListener('click', async () => {
  if (!confirm('确定要重置应用吗？所有数据（含 API Key）都将删除！')) return;
  if (!confirm('再次确认：这将删除所有单词和设置，确定继续？')) return;
  const all = await getAllCards();
  for (const card of all) {
    await deleteCard(card.word);
  }
  localStorage.removeItem('minimax_api_key');
  localStorage.removeItem('minimax_model');
  localStorage.removeItem('card_cache');
  localStorage.removeItem('lastVocabSync');
  alert('所有数据已清空');
  await updateSettingsStats();
});

// --- 初始化 ---
switchTab('review');
