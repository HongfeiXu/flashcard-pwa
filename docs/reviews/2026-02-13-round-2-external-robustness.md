# 代码审查 Round 2 — 健壮性改进

> **文件说明**: 第二轮外部审查发现的边界问题及修复方案  
> **审查日期**: 2026-02-13  
> **评分变化**: 8.5/10 → 9/10  
> **审查类型**: 外部审查
> 
> **相关文档**:  
> - [Round 1](2026-02-13-round-1-security-xss-validation.md) — 安全性修复  
> - [Round 3](2026-02-13-round-3-final-polish.md) — 最终优化

---

## 审查结论

Round 1 的所有问题已修复，未发现新的 P0 问题。以下为新发现的边界 case。

---

## 🟡 新发现问题 (3个)

### 1. TTS 双触发 — iOS voiceschanged + timeout 重复朗读

**问题**: iOS Safari 首次调用 `speak()` 时 voices 为空，代码同时注册：
- `voiceschanged` 回调 → 重试朗读
- 1秒 `setTimeout` 兜底 → 强制朗读

如果 `voiceschanged` 先触发，1秒后 timeout 仍会触发，导致重复朗读。

**修复**: 互斥 `clearTimeout`：

```js
let _speakTimeout = null;

_pendingCallback = () => {
  _voicesReady = true;
  // voiceschanged 先到 → 取消 timeout
  if (_speakTimeout) {
    clearTimeout(_speakTimeout);
    _speakTimeout = null;
  }
  speak(word); // 重试
};

_speakTimeout = setTimeout(() => {
  _speakTimeout = null;
  // timeout 先到 → 清理 callback
  if (_pendingCallback) {
    window.speechSynthesis.removeEventListener('voiceschanged', _pendingCallback);
    _pendingCallback = null;
  }
  _voicesReady = true;
  _doSpeak(word, []);
}, 1000);
```

**文件**: `js/tts.js`

---

### 2. showConfirmDialog innerHTML 风险

**问题**: 
```js
overlay.innerHTML = `<p class="confirm-msg">${msg}</p>`;
```

当前所有调用都是安全的（硬编码字符串或已 `esc()` 的值），但函数签名暗示接受纯文本，实际接受 HTML，对后续维护者是隐患。

**修复**: 改用 `textContent`：

```js
overlay.innerHTML = `
  <div class="confirm-dialog">
    <p class="confirm-msg"></p>
    <div class="confirm-actions">...</div>
  </div>`;
overlay.querySelector('.confirm-msg').textContent = msg;
```

**好处**:
- 调用方不需要手动 `esc()`
- 消除 XSS 隐患

**文件**: `js/app.js`

---

### 3. existingWords 防御性不足

**问题**: 同步/导入时：
```js
const existingWords = new Set(existingCards.map(c => c.word.toLowerCase()));
```

假设 DB 中的 `c.word` 一定有值且是字符串。如果历史数据中某条 `word` 为 `undefined`（比如早期 bug 写入的脏数据），`c.word.toLowerCase()` 会抛 TypeError，整个同步/导入失败。

**修复**: 防御性编程：

```js
const existingWords = new Set(existingCards.map(c => (c.word || '').toLowerCase()));
```

**文件**: `js/app.js` (2 处)

---

## 修复统计

- **P0 问题**: 0
- **P1 问题**: 3 个（TTS 重复、XSS 隐患、防御性）
- **代码变更**: 3 个文件，21 insertions(+), 8 deletions(-)

---

## 改进亮点

- **TTS 更健壮**: iOS Safari 边界 case 覆盖
- **XSS 防护升级**: `showConfirmDialog` 不再信任调用方
- **防御性编程**: 对脏数据容错
