// lib/markdown.js - 助记文本渲染（简易 markdown → HTML）

import { esc } from './utils.js';

// 判断是否是表格行（以 | 开头和结尾，且有内容）
function isTableRow(line) {
  const stripped = line.trim();
  return stripped.startsWith('|') && stripped.endsWith('|') && stripped.length > 2;
}

// 判断是否是分隔行（|---|---|）
function isSeparatorRow(line) {
  return /^\|[\s|:-]+\|$/.test(line.trim());
}

// 解析表格行，返回列数组（原始内容，未转义）
function parseTableRow(line) {
  return line.trim().slice(1, -1).split('|').map(cell => cell.trim());
}

// 单行内联格式处理（已转义的 safe 字符串）
function applyInline(safe) {
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  return safe;
}

// 渲染单行（非表格行）
function renderLine(line) {
  let safe = esc(line);
  // --- → <hr>
  if (/^-{3,}$/.test(safe.trim())) return '<hr>';
  // ### / ## / # → 标题
  if (/^### /.test(safe)) return `<h4>${applyInline(safe.slice(4))}</h4>`;
  if (/^## /.test(safe)) return `<h3>${applyInline(safe.slice(3))}</h3>`;
  if (/^# /.test(safe)) return `<h3>${applyInline(safe.slice(2))}</h3>`;
  // > 引用块
  let isBlockquote = false;
  const bqMatch = safe.match(/^\s*&gt; (.*)/);
  if (bqMatch) { safe = bqMatch[1]; isBlockquote = true; }
  // 内联格式
  safe = applyInline(safe);
  // 无序列表
  if (/^\s*[-∙] /.test(safe)) safe = `• ${safe.replace(/^\s*[-∙] /, '')}`;
  // 包装输出
  if (!safe.trim()) return '<br>';
  if (isBlockquote) return `<blockquote style="border-left:3px solid #ffc107;padding-left:10px;margin:8px 0;color:#666;">${safe}</blockquote>`;
  if (safe.startsWith('• ')) return `<p style="margin:2px 0;padding-left:16px;">${safe}</p>`;
  return `<p style="margin:4px 0">${safe}</p>`;
}

// 渲染表格块
function renderTable(tableLines) {
  // 过滤掉分隔行，保留表头和数据行
  const dataRows = tableLines.filter(l => !isSeparatorRow(l));
  if (dataRows.length === 0) return '';

  let html = '<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:0.9em;">';

  // 第一行作为表头
  const headerCells = parseTableRow(dataRows[0]);
  html += '<thead><tr>';
  for (const cell of headerCells) {
    html += `<th style="border:1px solid #ddd;padding:6px 8px;background:var(--card-bg,#f5f5f5);text-align:left;">${applyInline(esc(cell))}</th>`;
  }
  html += '</tr></thead><tbody>';

  // 剩余行作为数据
  for (let r = 1; r < dataRows.length; r++) {
    const cells = parseTableRow(dataRows[r]);
    html += '<tr>';
    for (const cell of cells) {
      html += `<td style="border:1px solid #ddd;padding:6px 8px;">${applyInline(esc(cell))}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

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

  // 按行/块渲染
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 检测表格块：连续的表格行（允许表头和数据行之间有分隔行）
    if (isTableRow(line)) {
      const tableLines = [];
      while (i < lines.length && (isTableRow(lines[i]) || isSeparatorRow(lines[i]))) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(renderTable(tableLines));
      continue;
    }

    result.push(renderLine(line));
    i++;
  }

  return result.join('');
}

export { renderMnemonicText };
