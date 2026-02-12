// api.js - MiniMax API 调用 + 响应解析

// API 代理地址：本地开发走本地代理，生产环境走 Cloudflare Workers
const IS_LOCAL = location.hostname === 'localhost' || location.hostname.startsWith('192.168.');
const PROXY_BASE = IS_LOCAL
  ? '/api'  // 本地 proxy.py
  : 'https://flashcard-api-proxy.hongfeixu.workers.dev';  // Cloudflare Workers
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
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(text);
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
    return parseAIResponse(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('请求超时（30秒），请重试');
    throw err;
  }
}

export { generateCard, getApiKey };
