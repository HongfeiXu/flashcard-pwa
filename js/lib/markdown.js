// lib/markdown.js - 助记文本渲染（简易 markdown → HTML）

import { esc } from './utils.js';

function renderMnemonicText(text, word) {
  let lines = text.split('\n');

  // 裁掉首行基本信息（如果第一个非空行包含单词本身，视为重复）
  if (word) {
    const w = word.toLowerCase();
    for (let i = 0; i < lines.length && i < 3; i++) {
      if (lines[i].trim() && lines[i].toLowerCase().includes(w)) {
        lines = lines.slice(i + 1);
        // 跳过紧随的空行
        while (lines.length && !lines[0].trim()) lines.shift();
        break;
      }
      if (lines[i].trim()) break; // 非空行但不含单词，停止
    }
  }

  // 按行渲染
  return lines.map(line => {
    // HTML 转义
    let safe = esc(line);
    // --- → <hr>
    if (/^-{3,}$/.test(safe.trim())) return '<hr>';
    // ### / ## / # → 标题
    if (/^### /.test(safe)) return `<h4>${safe.slice(4)}</h4>`;
    if (/^## /.test(safe)) return `<h3>${safe.slice(3)}</h3>`;
    if (/^# /.test(safe)) return `<h3>${safe.slice(2)}</h3>`;
    // > 引用块（先提取内容，后面统一做 bold/italic 替换）
    let isBlockquote = false;
    const bqMatch = safe.match(/^\s*&gt; (.*)/);
    if (bqMatch) { safe = bqMatch[1]; isBlockquote = true; }
    // **text** → <strong>
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // *text* → <em>（单星号斜体，注意不要匹配 ** 的情况）
    safe = safe.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    // 无序列表 - item / ∙ item
    if (/^\s*[-∙] /.test(safe)) safe = `• ${safe.replace(/^\s*[-∙] /, '')}`;
    // 包装输出
    if (!safe.trim()) return '<br>';
    if (isBlockquote) return `<blockquote style="border-left:3px solid #ffc107;padding-left:10px;margin:8px 0;color:#666;">${safe}</blockquote>`;
    if (safe.startsWith('• ')) return `<p style="margin:2px 0;padding-left:16px;">${safe}</p>`;
    return `<p style="margin:4px 0">${safe}</p>`;
  }).join('');
}

export { renderMnemonicText };
