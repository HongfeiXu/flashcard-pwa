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

// 友好化 API 错误信息
function friendlyApiError(status, body) {
  if (status === 401) return 'API Key 无效，请在设置中检查并重新输入';
  if (status === 402 || (body && body.includes('insufficient'))) return 'API 余额不足，请前往 MiniMax 开放平台充值';
  if (status === 429) return '请求太频繁，请稍后再试';
  if (status >= 500) return 'AI 服务暂时不可用，请稍后再试';
  if (status === 403) return '请求被拒绝，可能是 API Key 权限问题';
  return `请求失败（${status}），请稍后重试`;
}

function parseAIResponse(data) {
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('AI 未返回有效内容，请重试');
  let text = textBlock.text.trim();
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    let fixed = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    try { return JSON.parse(fixed); } catch {}

    fixed = text
      .replace(/\u201c([^"\u201c\u201d]*)\u201d/g, '"$1"')
      .replace(/,\s*}/g, '}');
    try { return JSON.parse(fixed); } catch {}

    console.error('AI response parse failed:', text);
    throw new Error('AI 返回格式异常，请重试');
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
      throw new Error(friendlyApiError(res.status, errText));
    }

    const data = await res.json();
    console.log('API raw response:', JSON.stringify(data, null, 2));
    return parseAIResponse(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('请求超时（30秒），请检查网络后重试');
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('网络连接失败，请检查网络设置');
    }
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
  const [entry] = cache.splice(idx, 1);
  cache.push(entry);
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return entry.data;
}

function setCachedCard(word, data) {
  const cache = getCache();
  const idx = cache.findIndex(e => e.word === word);
  if (idx !== -1) cache.splice(idx, 1);
  cache.push({ word, data });
  while (cache.length > CACHE_MAX) cache.shift();
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export { generateCard, getApiKey, getCachedCard, setCachedCard };
