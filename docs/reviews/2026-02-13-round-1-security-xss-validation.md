# 代码审查 Round 1 — 安全性修复

> **文件说明**: 第一轮内部审查发现的安全问题（XSS、输入校验）及修复方案  
> **审查日期**: 2026-02-13  
> **评分变化**: 7/10 → 8.5/10  
> **审查类型**: 内部审查
> 
> **相关文档**:  
> - [Round 2](2026-02-13-round-2-external-robustness.md) — 外部审查  
> - [Round 3](2026-02-13-round-3-final-polish.md) — 最终优化

---

## 🔴 必修问题 (2个)

### 1. XSS — esc() 不转义双引号

**问题**: 初版 `esc()` 用 `textContent → innerHTML` 只转义 `<`, `>`, `&`，不转义双引号 `"`。

**风险**: 
```html
<div data-word="${esc(word)}">  <!-- 属性注入 XSS -->
```

如果 `word = foo" onclick="alert(1)`，则输出：
```html
<div data-word="foo" onclick="alert(1)">
```

**修复**: 改为正则版，覆盖 5 个字符：

```js
const _escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const _escRe = /[&<>"']/g;
function esc(s) {
  if (!s) return '';
  return String(s).replace(_escRe, c => _escMap[c]);
}
```

**影响范围**: 24 处 `innerHTML` 赋值

---

### 2. 导入/同步缺字段类型校验

**问题**: 只检查 `word` 存在，没校验类型和长度。恶意 JSON 可能导致：
- `word` 是数字/对象 → 运行时错误
- `phonetic` 是巨大数组 → 内存溢出
- 超长字符串 → 渲染卡顿

**修复**: 强制类型转换 + 截断：

```js
function safeStr(val, maxLen) {
  if (val == null) return '';
  return String(val).slice(0, maxLen);
}

// 使用
phonetic: safeStr(card.phonetic, 100),
pos: safeStr(card.pos, 50),
definition: safeStr(card.definition, 500),
mastered: Boolean(card.mastered),
createdAt: typeof card.createdAt === 'number' ? card.createdAt : Date.now(),
```

**影响**: 导入和同步两处

---

## 🟡 建议问题 (8个)

### 3. esc() 性能优化

**问题**: 每次调用创建 DOM 元素开销大。

**修复**: 正则版（已在问题 1 修复）。

---

### 4. LRU 缓存 localStorage.setItem 无 try-catch

**问题**: QuotaExceeded 或禁用 localStorage 时抛错。

**修复**:
```js
function saveCache(cache) {
  try { 
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); 
  } catch { 
    // 静默忽略，缓存丢失不影响核心功能
  }
}
```

---

### 5. 错误信息重复映射

**问题**: `friendlyDbError` 散落各处，维护困难。

**修复**: 统一映射表：

```js
const ERROR_MESSAGES = {
  DB_UNAVAILABLE: '无法访问本地存储...',
  STORAGE_FULL: '设备存储空间不足...',
  NETWORK: '网络连接失败...',
  // ...
};

function friendlyError(err) {
  return ERROR_MESSAGES[err.message] || err.message || '操作失败';
}
```

---

### 6. 词库全量重建 DOM（大词库卡顿）

**问题**: 
```js
libraryList.innerHTML = all.map(c => `<div>...</div>`).join('');
```
逐个 `innerHTML +=` 会导致回流。

**修复**: DocumentFragment 批量挂载：

```js
const frag = document.createDocumentFragment();
for (const c of all) {
  const item = document.createElement('div');
  item.innerHTML = `...`;
  // 绑定事件...
  frag.appendChild(item);
}
libraryList.innerHTML = '';
libraryList.appendChild(frag);
```

---

### 7. TTS voiceschanged 可能重复注册

**问题**: 每次调用 `speak()` 都可能注册新 listener。

**修复**: 用 `_pendingCallback` 追踪 + 清理旧 listener。

---

### 8. visualViewport 旋转后阈值不准

**问题**: `originalHeight` 只在页面加载时赋值一次。

**修复**:
```js
window.addEventListener('orientationchange', () => {
  setTimeout(() => { originalHeight = window.innerHeight; }, 200);
});
```

---

### 9. alert/confirm 在 PWA 模式体验差

**问题**: 原生弹窗样式不统一，iOS 尤其突兀。

**修复**: 自定义组件：
- `showToast(msg, type)` — 顶部 toast（success/error 颜色区分）
- `showConfirmDialog(msg, onConfirm)` — 遮罩对话框

---

### 10. SW 版本号手动管理容易忘

**问题**: 每次更新代码忘记改 `CACHE_VERSION`，用户拿不到新版。

**修复**: `scripts/bump-sw.sh` 自动更新时间戳。

---

## 修复统计

- **P0 问题**: 2 个（安全）
- **P1/P2 问题**: 8 个（性能 + 体验）
- **代码变更**: 6 个文件，262 insertions(+), 98 deletions(-)

---

## 关键改进

### 安全性
- XSS 防护全覆盖（24 处）
- 输入校验（类型 + 长度）

### 性能
- 正则版 `esc()` 替代 DOM 创建
- DocumentFragment 批量渲染
- LRU 缓存减少重复 API 调用

### 用户体验
- 自定义 toast/confirm
- 错误提示统一化 + 中文友好化
