// api.js - MiniMax API 调用 + 响应解析

// API 代理地址：本地开发走本地代理，生产环境走 Cloudflare Workers
const IS_LOCAL = location.hostname === 'localhost' || location.hostname.startsWith('192.168.');
const PROXY_BASE = IS_LOCAL
  ? '/api'  // 本地 proxy.py
  : 'https://flashcard-api-proxy.icevmj.workers.dev';  // Cloudflare Workers
const API_URL = PROXY_BASE + '/anthropic/v1/messages';

function getApiKey() {
  return localStorage.getItem('minimax_api_key') || '';
}

function getModel() {
  return localStorage.getItem('minimax_model') || 'MiniMax-M2.1-lightning';
}

function parseAIResponse(data) {
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text content in response');
  let text = textBlock.text.trim();
  // 清理各种 AI 可能返回的包裹格式
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // 移除可能的 <think>...</think> 标签（某些模型会返回）
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  // 替换中文引号为英文引号（AI 有时会返回中文引号导致 JSON 解析失败）
  text = text.replace(/\u201c/g, '"').replace(/\u201d/g, '"');
  text = text.replace(/\u2018/g, "'").replace(/\u2019/g, "'");
  // 尝试提取 JSON 对象（找第一个 { 到最后一个 }）
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    // 尝试修复常见问题：尾部多余逗号
    const fixed = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('AI response parse failed:', text);
      throw new Error('AI 返回格式异常，请重试');
    }
  }
}

async function generateCard(word) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('NO_API_KEY');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 500,
        system: '你是一个专业的英语词典助手。只返回 JSON，不要返回任何其他内容，不要用 markdown 代码块包裹。',
        messages: [{
          role: 'user',
          content: `请为单词 "${word}" 生成学习卡片，JSON 格式如下：
{
  "word": "单词原形",
  "phonetic": "国际音标，用 / / 包裹",
  "pos": "词性（如 n. / v. / adj. / adv.）",
  "definition": "简洁中文释义",
  "example": "一句实用英文例句",
  "example_cn": "例句中文翻译"
}`
        }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('API raw response:', JSON.stringify(data, null, 2));
    return parseAIResponse(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('请求超时（30秒），请重试');
    throw err;
  }
}

// --- LRU 缓存（最多 100 个单词，存 localStorage）---
const CACHE_KEY = 'card_cache';
const CACHE_MAX = 100;

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; }
  catch { return []; }
}

function getCachedCard(word) {
  const cache = getCache();
  const idx = cache.findIndex(e => e.word === word);
  if (idx === -1) return null;
  // 命中：移到末尾（最近使用）
  const [entry] = cache.splice(idx, 1);
  cache.push(entry);
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return entry.data;
}

function setCachedCard(word, data) {
  const cache = getCache();
  // 已存在则先移除
  const idx = cache.findIndex(e => e.word === word);
  if (idx !== -1) cache.splice(idx, 1);
  cache.push({ word, data });
  // 超过上限，丢弃最旧的
  while (cache.length > CACHE_MAX) cache.shift();
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export { generateCard, getApiKey, getCachedCard, setCachedCard };
