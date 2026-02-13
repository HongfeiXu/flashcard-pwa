# 代码审查修复记录

本文档记录三轮代码审查中发现的问题及修复方案。

---

## 第一轮审查 (Internal) — 7/10

### 🔴 必修问题

#### 1. XSS — esc() 不转义双引号

**问题**: 初版 `esc()` 用 `textContent → innerHTML` 只转义 `<`, `>`, `&`，不转义双引号。

**修复**: 改为正则版，覆盖 5 个字符：

```js
const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const _escRe = /[&<>"']/g;
function esc(s) {
  if (!s) return '';
  return String(s).replace(_escRe, c => _escMap[c]);
}
```

#### 2. 导入/同步缺字段类型校验

**问题**: 只检查 `word` 存在，没校验类型和长度。

**修复**: 强制类型转换 + 截断：

```js
function safeStr(val, maxLen) {
  if (val == null) return '';
  return String(val).slice(0, maxLen);
}

// 使用
phonetic: safeStr(card.phonetic, 100),
mastered: Boolean(card.mastered),
createdAt: typeof card.createdAt === 'number' ? card.createdAt : Date.now(),
```

### 🟡 建议问题

- DocumentFragment 批量渲染 → 避免大词库卡顿 ✅
- LRU 缓存 try-catch ✅
- 统一错误映射 `ERROR_MESSAGES` ✅
- iOS visualViewport 旋转修复 ✅
- inline onclick → 动态绑定 ✅
- 清空 API Key 支持 ✅
- SW 版本自动化脚本 ✅

**评分**: 7/10 → 8.5/10

---

## 第二轮审查 (External) — 8.5/10

### 🔴 必修问题

全部已在第一轮修复，第二轮未发现新的 P0 问题。

### 🟡 新发现问题

#### 1. TTS 双触发

**问题**: `voiceschanged` 回调和 1s 超时可能同时触发。

**修复**: 互斥 clearTimeout：

```js
if (_speakTimeout) {
  clearTimeout(_speakTimeout);
  _speakTimeout = null;
}
```

#### 2. showConfirmDialog innerHTML 风险

**问题**: `msg` 直接插入 innerHTML，虽然当前调用都安全，但对维护者是隐患。

**修复**: 改用 `textContent`：

```js
overlay.innerHTML = `<div class="confirm-dialog"><p class="confirm-msg"></p>...</div>`;
overlay.querySelector('.confirm-msg').textContent = msg;
```

#### 3. existingWords 防御性不足

**问题**: 假设 DB 中 `c.word` 一定有值，脏数据会导致 TypeError。

**修复**:

```js
const existingWords = new Set(existingCards.map(c => (c.word || '').toLowerCase()));
```

**评分**: 8.5/10 → 9/10

---

## 第三轮审查 (Final) — 9/10

### 🔴 必修问题

无。

### 🟡 优化建议

#### 1. 复习进度保留

**问题**: 切换 tab 会重新 `initReview()`，进度丢失（2/10 → 1/9）。

**修复**: 加 `reviewActive` 标志：

```js
async function initReview(force = false) {
  if (reviewActive && !force) return;
  // ...
  reviewActive = true;
}
```

#### 2. 项目结构重整

**问题**: 文档、脚本混在根目录。

**修复**: 分类整理：

```
docs/           # 技术文档
scripts/        # 工具脚本
CHANGELOG.md    # 变更日志
```

**评分**: 9/10 → 9+/10

---

## 修复统计

| 轮次 | P0 问题 | P1/P2 问题 | 评分变化 |
|------|---------|-----------|----------|
| 1    | 2       | 8         | 7 → 8.5  |
| 2    | 0       | 3         | 8.5 → 9  |
| 3    | 0       | 2         | 9 → 9+   |

**总计修复**: 2 个严重问题、13 个改进项

---

## 关键改进总结

### 安全性
- XSS 防护全覆盖（24 处 `esc()` + 属性转义）
- 输入校验（类型 + 长度 + prompt injection 防御）

### 健壮性
- 错误处理统一化（`ERROR_MESSAGES` 映射）
- 防御性编程（`(c.word || '')`，QuotaExceeded 捕获）
- IndexedDB 重试逻辑

### 性能
- DocumentFragment 批量渲染
- LRU 缓存减少重复 API 调用
- 正则版 `esc()` 替代 DOM 创建

### 用户体验
- 自定义 toast/confirm 替代原生 alert
- 复习进度保留
- 错误提示中文化友好化

### 代码质量
- 项目结构清晰
- 注释完整
- 无 TODO/FIXME/HACK 残留
