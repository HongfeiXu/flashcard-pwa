# 踩坑经验与解决方案

> **相关文档**:
> - [代码审查修复](code-review-fixes.md) — 质量改进历程
> - [本地开发环境](setup.md) — 避免常见配置问题

---

## 1. Web Crypto API 安全上下文限制

### 问题
```
TypeError: Cannot read properties of undefined (reading 'importKey')
```

### 原因
`crypto.subtle` 只在**安全上下文**中可用：
- ✅ HTTPS
- ✅ `http://localhost`
- ✅ `http://127.0.0.1`
- ❌ `http://192.168.x.x`

### 解决方案
本地测试用 `http://localhost:8080`，不要用局域网 IP。

---

## 2. MiniMax API CORS Preflight 403

### 问题
浏览器直接调用 MiniMax API 时，OPTIONS 请求返回 403。

### 原因
MiniMax API 不支持浏览器跨域直接调用（没有正确的 CORS 响应头）。

### 解决方案
部署 Cloudflare Workers 代理，转发 API 请求并添加 CORS 头。

---

## 3. JSON 解析失败 — AI 返回中文引号

### 问题
MiniMax AI 返回的 JSON 中混入了中文引号 `""`，导致 `JSON.parse()` 报错。

### 解决方案
多层容错解析：

```js
// 1. 提取 JSON 块
text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

// 2. 移除 <think> 标签
text = text.replace(/<think>[\s\S]*?<\/think>/g, '');

// 3. 尝试直接解析
try { return JSON.parse(text); } catch {}

// 4. 修复尾部逗号
fixed = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
try { return JSON.parse(fixed); } catch {}

// 5. 替换中文引号（最后手段）
fixed = text.replace(/\u201c([^"\u201c\u201d]*)\u201d/g, '"$1"');
```

---

## 4. iOS Safari 键盘弹出后 Tab Bar 不消失

### 问题
键盘弹出后底部 Tab Bar 遮挡输入框。

### 解决方案
使用 `visualViewport` API 监听键盘状态：

```js
window.visualViewport.addEventListener('resize', () => {
  const keyboardOpen = vv.height < originalHeight * 0.75;
  tabBar.style.display = keyboardOpen ? 'none' : 'flex';
});
```

**注意**：旋转设备后需要更新 `originalHeight`。

---

## 5. Service Worker 缓存导致代码不更新

### 问题
修改 JS/CSS 后刷新页面，代码没变化。

### 原因
Service Worker Cache First 策略缓存了旧版本。

### 解决方案
1. **开发时**: Chrome DevTools → Application → Service Workers → 勾选 "Update on reload"
2. **部署时**: 每次更新代码必须修改 `sw.js` 中的 `CACHE_VERSION`

---

## 6. IndexedDB 在隐私模式下不可用

### 问题
```
Error: DB_UNAVAILABLE
```

### 原因
浏览器隐私/无痕模式禁用 IndexedDB。

### 解决方案
检测并友好提示：

```js
try {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onerror = () => {
    throw new Error('DB_UNAVAILABLE');
  };
} catch {
  showError('无法访问本地存储，请使用正常浏览模式');
}
```

---

## 7. LRU 缓存写 localStorage 时 QuotaExceeded

### 问题
缓存过多数据导致 `localStorage.setItem()` 报错。

### 解决方案
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

## 8. TTS iOS 重复朗读

### 问题
iOS Safari 首次调用 `speak()` 时 voices 为空，注册 `voiceschanged` 回调 + 1s 超时兜底，两者都触发导致重复朗读。

### 解决方案
互斥锁 — voiceschanged 先到则取消 timeout：

```js
if (_speakTimeout) {
  clearTimeout(_speakTimeout);
  _speakTimeout = null;
}
```

---

## 9. 导入词库时大小写重复

### 问题
用户导入包含 `Apple` 和 `apple` 的 JSON，两者都被存入数据库。

### 解决方案
```js
const existingWords = new Set(existingCards.map(c => c.word.toLowerCase()));
const w = card.word.trim().toLowerCase();
if (existingWords.has(w)) { skipped++; continue; }
```

---

## 10. vocab.enc 解密失败 — 格式不匹配

### 问题
`vocab.json` 更新后忘记重新加密，导致 `vocab.enc` 是旧版。

### 解决方案
经济学人 cron 流程自动化：

```bash
追加 vocab.json → node scripts/encrypt-vocab.js → git add vocab.enc → push
```

手动修改 `vocab.json` 后记得执行加密脚本。

---

## 总结：开发最佳实践

1. **本地测试用 localhost，不用 192.168.x.x**
2. **修改代码后记得 bump SW 版本号**
3. **IndexedDB 操作全包 try-catch**
4. **API 返回解析要多层容错**
5. **重要自动化流程写成脚本，不靠人工记忆**
