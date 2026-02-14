// lib/utils.js - 从 app.js 抽取的纯逻辑函数

// --- HTML 转义，防止 XSS（正则版，避免重复创建 DOM 元素）---
const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const _escRe = /[&<>"']/g;
function esc(s) {
  if (!s) return '';
  return String(s).replace(_escRe, c => _escMap[c]);
}

// --- 字段清洗：强制字符串 + 截断 ---
function safeStr(val, maxLen) {
  if (val == null) return '';
  return String(val).slice(0, maxLen);
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

// --- 输入验证 ---
function validateWord(input) {
  const word = input.trim().toLowerCase();
  if (!word) return { valid: false, msg: '请输入单词' };
  if (word.length > 50) return { valid: false, msg: '输入过长，请输入单个单词或短语' };
  if (!/^[a-zA-Z][a-zA-Z\s\-']*$/.test(word)) return { valid: false, msg: '请输入有效的英文单词' };
  return { valid: true, word };
}

// --- Fisher-Yates 洗牌 ---
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export { esc, safeStr, friendlyError, validateWord, shuffle, ERROR_MESSAGES };
