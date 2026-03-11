// app.js - 主逻辑

import { getAllCards, getCard, addCard, putCard, deleteCard, clearAll, bulkImport } from './db.js';
import { generateCard, generateMnemonic, getApiKey, getCachedCard, setCachedCard, decryptVocab } from './api.js';
import { speak } from './tts.js';
import { esc, safeStr, friendlyError, validateWord, shuffle } from './lib/utils.js';
import { selectTodayWords, processAnswer, getTodayDate, MAX_LEVEL } from './lib/srs.js';
import { renderMnemonicText } from './lib/markdown.js';

// --- 主题切换 ---
function getTheme() {
  return localStorage.getItem('theme') || 'auto';
}

function applyDarkAttr(mode) {
  const el = document.documentElement;
  if (mode === 'dark') {
    el.setAttribute('data-dark', '');
  } else if (mode === 'light') {
    el.removeAttribute('data-dark');
  } else {
    // auto
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      el.setAttribute('data-dark', '');
    } else {
      el.removeAttribute('data-dark');
    }
  }
}

// Listen for system theme changes (for auto mode)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getTheme() === 'auto') applyDarkAttr('auto');
});

function setTheme(mode) {
  localStorage.setItem('theme', mode);
  document.documentElement.setAttribute('data-theme', mode);
  applyDarkAttr(mode);
  updateThemeButtons();
}

function updateThemeButtons() {
  const current = getTheme();
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === current);
  });
}

// Theme switcher event delegation
document.getElementById('theme-switcher').addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  setTheme(btn.dataset.theme);
});

// --- 日期格式化 MM-DD ---
function formatMMDD(ts) {
  const d = new Date(ts);
  const parts = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }).split('-');
  return `${parts[1]}-${parts[2]}`;
}

// --- 连续学习天数 ---
function updateStudyStreak() {
  const today = getTodayDate();
  let streak;
  try { streak = JSON.parse(localStorage.getItem('studyStreak')); } catch {}
  if (!streak || typeof streak !== 'object') streak = { lastDate: null, count: 0 };

  if (streak.lastDate === today) return; // 今天已记录

  // 计算昨天日期
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });

  if (streak.lastDate === yesterday) {
    streak.count++;
  } else {
    streak.count = 1;
  }
  streak.lastDate = today;
  localStorage.setItem('studyStreak', JSON.stringify(streak));
}

// --- 学习记录持久化 ---
function recordInteraction(isCorrect, isFirstTime) {
  const today = getTodayDate();
  let history;
  try { history = JSON.parse(localStorage.getItem('studyHistory')); } catch {}
  if (!Array.isArray(history)) history = [];

  // Find or create today's entry
  let entry = history.find(h => h.date === today);
  if (!entry) {
    entry = { date: today, interactions: 0, correct: 0, wrong: 0 };
    history.push(entry);
  }
  entry.interactions++;

  if (isFirstTime) {
    if (isCorrect) {
      entry.correct++;
      localStorage.setItem('totalCorrect', String((parseInt(localStorage.getItem('totalCorrect')) || 0) + 1));
    } else {
      entry.wrong++;
      localStorage.setItem('totalWrong', String((parseInt(localStorage.getItem('totalWrong')) || 0) + 1));
    }
  }

  // Cumulative counter
  localStorage.setItem('totalInteractions', String((parseInt(localStorage.getItem('totalInteractions')) || 0) + 1));

  // Clean entries older than 30 days
  const cutoff = new Date(today + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
  history = history.filter(h => h.date >= cutoffStr);

  localStorage.setItem('studyHistory', JSON.stringify(history));
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
  if (id === 'me') renderMe();
}

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// --- 复习页 ---
let currentCard = null;
let isFlipped = false;
let reviewActive = false;

// SRS 今日任务状态
let todayReview = null; // { date, words, queue, firstAnswered, correctCount, wrongCount }

const reviewArea = document.getElementById('review-area');

function getDailyQuota() {
  return parseInt(localStorage.getItem('dailyQuota')) || 10;
}

function saveTodayReview() {
  if (todayReview) localStorage.setItem('todayReview', JSON.stringify(todayReview));
}

function migrateCard(card) {
  if (card.level === undefined) card.level = 0;
  if (card.correctStreak === undefined) card.correctStreak = 0;
  if (card.nextReviewDate === undefined) card.nextReviewDate = null;
  if (card.totalReviews === undefined) card.totalReviews = 0;
  if (card.mastered === true && card.level === 0) card.level = MAX_LEVEL + 1;
  return card;
}

async function initReview(force = false) {
  if (reviewActive && !force) return;

  try {
    const all = await getAllCards();
    all.forEach(migrateCard);
    const today = getTodayDate();

    // Check localStorage for existing today's review
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('todayReview')); } catch {}

    if (saved && saved.date === today && !force) {
      todayReview = saved;
      if (todayReview.queue.length === 0) {
        reviewActive = false;
        showCompletePage();
        return;
      }
      reviewActive = true;
      showCard();
      return;
    }

    // Generate new task
    const quota = getDailyQuota();
    const words = selectTodayWords(all, quota, today);

    if (words.length === 0) {
      reviewActive = false;
      todayReview = null;
      reviewArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>${all.length === 0 ? '词库为空，去添加第一个单词吧！' : '所有单词都已掌握！🎉'}</p>
          <button class="btn btn-primary" id="btn-go-add">去添加</button>
        </div>`;
      document.getElementById('btn-go-add').onclick = () => switchTab('add');
      return;
    }

    todayReview = {
      date: today,
      words: [...words],
      queue: [...words],
      firstAnswered: [],
      correctCount: 0,
      wrongCount: 0
    };
    saveTodayReview();
    reviewActive = true;
    showCard();
  } catch (err) {
    reviewActive = false;
    reviewArea.innerHTML = `<div class="error-msg">${esc(friendlyError(err))}</div>`;
  }
}

function showCompletePage() {
  const tr = todayReview;
  reviewArea.innerHTML = `
    <div class="review-done">
      <div class="done-icon">🎉</div>
      <h2>今日任务完成！</h2>
      <div class="stats-grid">
        <div class="stat"><span class="stat-num">${tr.words.length}</span><span class="stat-label">总数</span></div>
        <div class="stat"><span class="stat-num">${tr.correctCount}</span><span class="stat-label">✅ 答对</span></div>
        <div class="stat"><span class="stat-num">${tr.wrongCount}</span><span class="stat-label">❌ 答错</span></div>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="btn-again">再来一轮</button>
        <button class="btn btn-back-lib" id="btn-back-lib">返回词库</button>
      </div>
    </div>`;
  document.getElementById('btn-again').onclick = async () => {
    try {
      const all = await getAllCards();
      all.forEach(migrateCard);
      const today = getTodayDate();
      const quota = getDailyQuota();
      const words = selectTodayWords(all, quota, today);
      if (words.length === 0) {
        showToast('今天没有更多需要复习的了，明天继续！', 'success');
        return;
      }
      todayReview = {
        date: today,
        words: [...words],
        queue: [...words],
        firstAnswered: [],
        correctCount: 0,
        wrongCount: 0
      };
      saveTodayReview();
      reviewActive = true;
      showCard();
    } catch (err) {
      showToast(friendlyError(err));
    }
  };
  document.getElementById('btn-back-lib').onclick = () => switchTab('library');
}

async function showCard() {
  // 跨午夜检测
  const today = getTodayDate();
  if (todayReview && todayReview.date !== today) {
    reviewActive = false;
    initReview(true);
    return;
  }

  if (!todayReview || todayReview.queue.length === 0) {
    reviewActive = false;
    showCompletePage();
    return;
  }

  const word = todayReview.queue[0];

  // 从 DB 获取卡片数据（可能已被删除）
  let cardData;
  try {
    cardData = await getCard(word);
  } catch (err) {
    showGlobalError(friendlyError(err));
  }
  if (!cardData) {
    // 单词已被删除，跳过
    todayReview.queue.shift();
    saveTodayReview();
    showCard();
    return;
  }
  migrateCard(cardData);
  currentCard = cardData;
  isFlipped = false;

  const completed = todayReview.words.length - todayReview.queue.length;

  reviewArea.innerHTML = `
    <div class="progress-text">今日任务：${completed + 1} / ${todayReview.words.length}</div>
    <div class="card-container fade-in" id="card-flip">
      <div class="card">
        <div class="card-front">
          <div class="card-word">${esc(currentCard.word)}</div>
          ${currentCard.example ? `<div class="card-example-front">${esc(currentCard.example)}</div>` : ''}
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
    </div>
    <div id="mnemonic-wrapper" style="display:none;width:100%;text-align:center;">
      <button class="btn-mnemonic" id="btn-mnemonic">💡 助记</button>
      <div class="mnemonic-area" id="mnemonic-area" style="display:none;"></div>
    </div>`;

  // 翻卡动画（保留原有逻辑）
  let currentRotation = 0;
  let isFlipping = false;
  
  document.getElementById('card-flip').onclick = (e) => {
    if (isFlipping) return;
    
    const el = document.getElementById('card-flip');
    const card = el.querySelector('.card');
    const rect = el.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;
    
    if (Math.abs(currentRotation) >= 360) {
      card.style.transition = 'none';
      currentRotation = currentRotation > 0 ? currentRotation - 360 : currentRotation + 360;
      card.style.transform = `rotateY(${currentRotation}deg)`;
      void card.offsetWidth;
      card.style.transition = '';
    }
    
    const delta = isRightSide ? 180 : -180;
    currentRotation += delta;
    card.style.transform = `rotateY(${currentRotation}deg)`;
    
    if (!isFlipped) {
      document.getElementById('review-actions').style.display = 'flex';
      document.getElementById('mnemonic-wrapper').style.display = 'block';
      isFlipped = true;
    } else {
      document.getElementById('review-actions').style.display = 'none';
      document.getElementById('mnemonic-wrapper').style.display = 'none';
      document.getElementById('mnemonic-area').style.display = 'none';
      isFlipped = false;
    }
    
    isFlipping = true;
    setTimeout(() => { isFlipping = false; }, 500);
  };

  document.getElementById('btn-tts').onclick = (e) => { e.stopPropagation(); speak(currentCard.word); };
  document.getElementById('btn-tts-word-back').onclick = (e) => { e.stopPropagation(); speak(currentCard.word); };
  const ttsExample = document.getElementById('btn-tts-example');
  if (ttsExample) ttsExample.onclick = (e) => { e.stopPropagation(); speak(currentCard.example); };

  // --- 助记按钮 ---
  document.getElementById('btn-mnemonic').onclick = async () => {
    const btn = document.getElementById('btn-mnemonic');
    const area = document.getElementById('mnemonic-area');

    // 1. 已显示 → 收起
    if (area.style.display !== 'none' && area.innerHTML) {
      area.style.display = 'none';
      return;
    }
    // 2. 有缓存但隐藏 → 展示
    if (currentCard.mnemonic) {
      area.innerHTML = renderMnemonicText(currentCard.mnemonic, currentCard.word);
      area.style.display = 'block';
      return;
    }

    // No API key check
    if (!getApiKey()) {
      area.innerHTML = '<span class="error-msg">请先在设置中输入 API Key</span>';
      area.style.display = 'block';
      return;
    }

    // Generate
    const savedWord = currentCard.word;
    btn.textContent = '⏳ 生成中...';
    btn.disabled = true;
    area.style.display = 'none';

    try {
      const text = await generateMnemonic(savedWord);
      // Card may have changed
      if (currentCard && currentCard.word === savedWord) {
        const updated = { ...currentCard, mnemonic: text };
        await putCard(updated);
        currentCard = updated;
        area.innerHTML = renderMnemonicText(text, currentCard.word);
        area.style.display = 'block';
        btn.textContent = '💡 助记';
        btn.disabled = false;
      }
    } catch (err) {
      if (currentCard && currentCard.word === savedWord) {
        const msg = err.message === 'NO_API_KEY' ? '请先在设置中输入 API Key' : err.message;
        area.innerHTML = `<span class="error-msg">${esc(msg)}</span> <button class="btn btn-sm" id="btn-mnemonic-retry">重试</button>`;
        area.style.display = 'block';
        btn.textContent = '💡 助记';
        btn.disabled = false;
        const retryBtn = document.getElementById('btn-mnemonic-retry');
        if (retryBtn) retryBtn.onclick = () => {
          area.style.display = 'none';
          area.innerHTML = '';
          document.getElementById('btn-mnemonic').onclick();
        };
      }
    }
  };

  document.getElementById('btn-known').onclick = async () => {
    updateStudyStreak();
    const isFirstTime = !todayReview.firstAnswered.includes(word);
    recordInteraction(true, isFirstTime);
    todayReview.queue.shift();

    if (isFirstTime) {
      todayReview.firstAnswered.push(word);
      todayReview.correctCount++;
      const today = getTodayDate();
      const updated = processAnswer(currentCard, true, today);
      try { await putCard(updated); } catch (err) { showGlobalError(friendlyError(err)); }
    }
    // Retry correct → just remove from queue (no DB update)

    saveTodayReview();
    showCard();
  };

  document.getElementById('btn-unknown').onclick = async () => {
    updateStudyStreak();
    const isFirstTime = !todayReview.firstAnswered.includes(word);
    recordInteraction(false, isFirstTime);
    todayReview.queue.shift();

    if (isFirstTime) {
      todayReview.firstAnswered.push(word);
      todayReview.wrongCount++;
      const today = getTodayDate();
      const updated = processAnswer(currentCard, false, today);
      try { await putCard(updated); } catch (err) { showGlobalError(friendlyError(err)); }
    }
    // Wrong → push back to end of queue
    todayReview.queue.push(word);

    saveTodayReview();
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
  if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.')) return '/vocab.enc';
  return 'https://hongfeixu.github.io/flashcard-pwa/vocab.enc';
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
      const raw = await resp.text();
      vocabList = await decryptVocab(raw);
    } catch (e) {
      throw new Error('PARSE');
    }
    if (!Array.isArray(vocabList)) throw new Error('PARSE');

    // 先获取已有单词（统一小写比较），过滤出需要新增的
    const existingCards = await getAllCards();
    const existingWords = new Set(existingCards.map(c => (c.word || '').toLowerCase()));
    const newCards = [];
    let skipped = 0;
    for (const item of vocabList) {
      if (!item.word || typeof item.word !== 'string') continue;
      const w = item.word.trim().toLowerCase();
      if (!w || w.length > 100) continue;
      if (existingWords.has(w)) { skipped++; continue; }
      existingWords.add(w); // 防止同一批次内重复
      newCards.push({
        word: w,
        phonetic: safeStr(item.phonetic, 100),
        pos: safeStr(item.pos, 50),
        definition: safeStr(item.definition, 500),
        example: safeStr(item.example, 500),
        example_cn: safeStr(item.example_cn, 500),
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
      const mc = migrateCard(c);
      const levelBadge = mc.mastered ? '🏆' : '⭐'.repeat(mc.level || 0) + '☆'.repeat(Math.max(0, 3 - (mc.level || 0)));
      const difficult = mc.totalReviews >= 6 && (mc.level || 0) <= 1 && !mc.mastered;
      const lastDate = mc.lastReviewedAt ? formatMMDD(mc.lastReviewedAt) : '--';
      let nextDate;
      if (mc.mastered) nextDate = '已掌握';
      else if (!mc.nextReviewDate) nextDate = '待定';
      else nextDate = formatMMDD(new Date(mc.nextReviewDate).getTime());
      const nextIcon = mc.mastered ? '⏰ ' : '⏰ 下次 ';
      item.innerHTML = `
        <div class="lib-row">
          <span class="lib-word">${esc(c.word)}${difficult ? ' 🔴' : ''}</span>
          <span class="lib-def">${esc(c.definition)}</span>
          <span class="lib-badge ${mc.mastered ? 'badge-mastered' : 'badge-pending'}">${levelBadge}</span>
        </div>
        <div class="lib-detail" style="display:none;">
          <p>${esc(c.phonetic)} ${esc(c.pos)} <button class="btn-speak btn-speak-lib">🔊</button></p>
          <p>${esc(c.example)}${c.example ? ' <button class="btn-speak-inline btn-speak-example">🔊</button>' : ''}</p>
          <p class="text-muted">${esc(c.example_cn)}</p>
          <div class="srs-info">
            <div>📖 复习 ${mc.totalReviews || 0} 次 | 🔥 连对 ${mc.correctStreak || 0} 次</div>
            <div>📅 上次 ${lastDate} | ${nextIcon}${nextDate}${difficult ? ' | ⚠️ 困难词' : ''}</div>
          </div>
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
        showConfirmDialog(`确定删除 "${word}"？`, async () => {
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
document.getElementById('btn-me-settings').addEventListener('click', async () => {
  document.getElementById('page-me').classList.remove('active');
  document.getElementById('page-settings').classList.add('active');
  tabs.forEach(t => t.classList.remove('active'));
  const keyInput = document.getElementById('settings-apikey');
  keyInput.value = localStorage.getItem('minimax_api_key') || '';
  document.getElementById('settings-model').value = localStorage.getItem('minimax_model') || 'MiniMax-M2.1-lightning';
  updateQuotaButtons();
  updateThemeButtons();
  await updateSettingsStats();
});

// --- 配额选择 ---
function updateQuotaButtons() {
  const current = getDailyQuota();
  document.querySelectorAll('.quota-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.quota) === current);
  });
}

document.getElementById('quota-buttons').addEventListener('click', (e) => {
  const btn = e.target.closest('.quota-btn');
  if (!btn) return;
  const newQuota = parseInt(btn.dataset.quota);
  const current = getDailyQuota();
  if (newQuota === current) return;

  showConfirmDialog('修改配额将重新生成今日任务，当前进度将重置。确定吗？', () => {
    localStorage.setItem('dailyQuota', String(newQuota));
    localStorage.removeItem('todayReview');
    todayReview = null;
    reviewActive = false;
    updateQuotaButtons();
    showToast(`每日配额已设为 ${newQuota}`, 'success');
  });
});

async function updateSettingsStats() {
  try {
    const all = await getAllCards();
    const el = document.getElementById('settings-stats');
    el.innerHTML = `<div>共 ${esc(String(all.length))} 个单词</div>`;
  } catch (err) {
    document.getElementById('settings-stats').textContent = friendlyError(err);
  }
}

document.getElementById('btn-settings-back').addEventListener('click', () => {
  document.getElementById('page-settings').classList.remove('active');
  switchTab('me');
});

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const key = document.getElementById('settings-apikey').value.trim();
  const model = document.getElementById('settings-model').value;
  if (key) {
    localStorage.setItem('minimax_api_key', key);
  } else {
    localStorage.removeItem('minimax_api_key');
  }
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
    const existingWords = new Set(existingCards.map(c => (c.word || '').toLowerCase()));
    const newCards = [];
    let skipped = 0;
    for (const card of cards) {
      if (!card.word || typeof card.word !== 'string') continue;
      const w = card.word.trim().toLowerCase();
      if (!w || w.length > 100) continue;
      if (existingWords.has(w)) { skipped++; continue; }
      existingWords.add(w); // 防止同一批次内重复
      newCards.push({
        word: w,
        phonetic: safeStr(card.phonetic, 100),
        pos: safeStr(card.pos, 50),
        definition: safeStr(card.definition, 500),
        example: safeStr(card.example, 500),
        example_cn: safeStr(card.example_cn, 500),
        mastered: Boolean(card.mastered),
        createdAt: typeof card.createdAt === 'number' ? card.createdAt : Date.now(),
        reviewCount: typeof card.reviewCount === 'number' ? card.reviewCount : 0,
        correctCount: typeof card.correctCount === 'number' ? card.correctCount : 0,
        lastReviewedAt: typeof card.lastReviewedAt === 'number' ? card.lastReviewedAt : null
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
      localStorage.removeItem('todayReview');
      todayReview = null;
      reviewActive = false;
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
      localStorage.removeItem('todayReview');
      localStorage.removeItem('dailyQuota');
      localStorage.removeItem('studyHistory');
      localStorage.removeItem('totalInteractions');
      localStorage.removeItem('totalCorrect');
      localStorage.removeItem('totalWrong');
      localStorage.removeItem('studyStreak');
      todayReview = null;
      reviewActive = false;
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
      <p class="confirm-msg"></p>
      <div class="confirm-actions">
        <button class="btn btn-sm confirm-cancel">取消</button>
        <button class="btn btn-sm btn-danger confirm-ok">确定</button>
      </div>
    </div>`;
  overlay.querySelector('.confirm-msg').textContent = msg;
  document.body.appendChild(overlay);

  overlay.querySelector('.confirm-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.confirm-ok').onclick = () => { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// --- "我的"页面 ---
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getWeekData() {
  let history;
  try { history = JSON.parse(localStorage.getItem('studyHistory')); } catch {}
  if (!Array.isArray(history)) history = [];

  const todayStr = getTodayDate();
  const today = new Date(todayStr + 'T00:00:00+08:00');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
    const entry = history.find(h => h.date === dateStr);
    days.push({
      date: dateStr,
      weekday: WEEKDAYS[d.getDay()],
      interactions: entry ? entry.interactions : 0,
      isToday: i === 0
    });
  }
  return days;
}

async function renderMe() {
  // Streak
  let streakCount = 0;
  try {
    const streak = JSON.parse(localStorage.getItem('studyStreak'));
    if (streak && streak.count > 0) streakCount = streak.count;
  } catch {}
  document.getElementById('me-streak-count').textContent = streakCount;

  // Total interactions
  const totalInteractions = parseInt(localStorage.getItem('totalInteractions')) || 0;
  document.getElementById('me-total-count').textContent = totalInteractions;

  // 7-day chart
  const weekData = getWeekData();
  const maxVal = Math.max(...weekData.map(d => d.interactions), 1);
  const chartEl = document.getElementById('me-chart');
  chartEl.innerHTML = weekData.map(d => {
    const height = d.interactions > 0 ? Math.max(4, Math.round((d.interactions / maxVal) * 120)) : 4;
    const colorClass = d.interactions === 0 ? 'empty' : (d.isToday ? 'today' : '');
    return `<div class="chart-col">
      <div class="chart-weekday">${esc(d.weekday)}</div>
      <div class="chart-bar-wrap"><div class="chart-bar ${colorClass}" style="height:${height}px"></div></div>
      <div class="chart-num">${esc(String(d.interactions))}</div>
    </div>`;
  }).join('');

  // Vocab stats
  try {
    const all = await getAllCards();
    all.forEach(migrateCard);
    const masteredCount = all.filter(c => c.mastered).length;
    const levels = [0, 0, 0, 0];
    let difficultCount = 0;
    all.forEach(c => {
      if (!c.mastered && c.level >= 0 && c.level <= 3) levels[c.level]++;
      if (!c.mastered && (c.totalReviews || 0) >= 6 && (c.level || 0) <= 1) difficultCount++;
    });

    const totalCorrect = parseInt(localStorage.getItem('totalCorrect')) || 0;
    const totalWrong = parseInt(localStorage.getItem('totalWrong')) || 0;
    const totalAnswered = totalCorrect + totalWrong;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

    document.getElementById('me-vocab-stats').innerHTML = `
      <div class="me-stat-row">总词数 <strong>${esc(String(all.length))}</strong></div>
      <div class="me-stat-row">新词 ${esc(String(levels[0]))} · 初识 ${esc(String(levels[1]))} · 熟悉 ${esc(String(levels[2]))} · 巩固 ${esc(String(levels[3]))} · 掌握 ${esc(String(masteredCount))}</div>
      <div class="me-stat-row">✅ 总正确率 ${accuracy !== null ? esc(String(accuracy)) + '%' : '--'}</div>
      <div class="me-stat-row">🔴 困难词 ${esc(String(difficultCount))} 个</div>`;
  } catch (err) {
    document.getElementById('me-vocab-stats').innerHTML = `<div class="error-msg">${esc(friendlyError(err))}</div>`;
  }

  // Today progress
  const todayEl = document.getElementById('me-today-stats');
  if (todayReview && todayReview.date === getTodayDate()) {
    const answered = todayReview.correctCount + todayReview.wrongCount;
    todayEl.innerHTML = `<div class="me-stat-row">今日：${esc(String(answered))}/${esc(String(todayReview.words.length))}（对 ${esc(String(todayReview.correctCount))} 错 ${esc(String(todayReview.wrongCount))}）</div>`;
  } else {
    todayEl.innerHTML = `<div class="me-stat-row text-muted">今天还没开始复习</div>`;
  }
}

// --- 回到顶部按钮 ---
const scrollTopBtn = document.getElementById('btn-scroll-top');
let _scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!_scrollTicking) {
    _scrollTicking = true;
    requestAnimationFrame(() => {
      scrollTopBtn.classList.toggle('show', window.scrollY > 100);
      _scrollTicking = false;
    });
  }
});
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- 初始化 ---
applyDarkAttr(getTheme());
switchTab('review');
