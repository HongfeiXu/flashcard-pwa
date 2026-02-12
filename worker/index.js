// Cloudflare Worker - MiniMax API CORS 代理
// 免费额度：10 万次/天，个人用完全够

const API_BASE = 'https://api.minimaxi.com';

// 允许的源（GitHub Pages + 本地开发）
const ALLOWED_ORIGINS = [
  'https://hongfeixu.github.io',
  'http://localhost:8080',
  'http://192.168.3.200:8080',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // 只允许 POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 转发到 MiniMax
    const url = new URL(request.url);
    const target = API_BASE + url.pathname;

    const resp = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'x-api-key': request.headers.get('x-api-key') || '',
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
      body: request.body,
    });

    const data = await resp.arrayBuffer();
    return new Response(data, {
      status: resp.status,
      headers: {
        ...corsHeaders(origin),
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
