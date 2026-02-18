# Phase 5.6: 深色模式

> **目标**: 支持浅色/深色/跟随系统三种主题模式  
> **创建日期**: 2026-02-18  
> **依赖**: Phase 5.5 ✅

---

## 1. 三种模式

| 模式 | localStorage 值 | 行为 |
|------|-----------------|------|
| ☀️ 浅色 | `theme: "light"` | 强制浅色 |
| 🌙 深色 | `theme: "dark"` | 强制深色 |
| 🔄 跟随系统 | `theme: "auto"` | 读取 `prefers-color-scheme` |

默认值：`auto`

## 2. CSS 实现

### 深色变量覆盖

在现有 `:root` 变量基础上，新增 `[data-theme="dark"]` 覆盖：

```css
[data-theme="dark"] {
  --bg: #1a1a1a;
  --card-bg: #2c2c2c;
  --text: #e5e5e5;
  --text-muted: #999;
  --shadow: 0 2px 12px rgba(0,0,0,0.3);
}
```

### 需要额外覆盖的硬编码颜色

以下地方用了硬编码颜色而非 CSS 变量，深色模式需要覆盖：

| 选择器 | 属性 | 浅色值 | 深色值 |
|--------|------|--------|--------|
| `.tab-bar` | `border-top` | `#e5e5e5` | `#444` |
| `.card-example` | `color` | `#333` | `#ccc` |
| `.add-form input` | `border` | `#ddd` | `#555` |
| `.add-form input:focus` | `border-color` | `var(--primary)` | 不变 |
| `.settings-group input/select` | `border` | `#ddd` | `#555` |
| `.settings-key-row button` | `border/background` | `#ddd/var(--bg)` | `#555/var(--bg)` |
| `.confirm-cancel` | `border/background` | `#ddd/var(--bg)` | `#555/var(--bg)` |
| `.srs-info` | `border-top/color` | `#eee/#888` | `#444/#aaa` |
| `.spinner` | `border` | `#eee` | `#444` |
| `.badge-mastered` | `background/color` | `#d4edda/#155724` | `#1a3a2a/#4caf50` |
| `.badge-pending` | `background/color` | `#fff3cd/#856404` | `#3a3520/#ffc107` |
| `.btn-mnemonic` | `background/color/border` | `#fff3cd/#856404/#ffc107` | `#3a3520/#ffc107/#665a00` |
| `.mnemonic-area` | `background` | `#f8f9fa` | `#333` |
| `.btn-sync` | `background/color` | `#f0f4ff/var(--primary)` | `#1a2a4a/var(--primary)` |
| `.chart-bar.empty` | `background` | `#e0e0e0` | `#444` |
| `.global-toast` | 保持不变（已是彩色背景白色文字） |
| `.update-banner` | 保持不变 |
| `hr` (in settings) | `border-top` | `#e5e5e5` | `#444` |
| `.quota-btn` | `border/background` | `#ddd/var(--bg)` | `#555/var(--bg)` |
| `.btn-secondary` | `border` | `#ddd` | `#555` |

### 跟随系统的 CSS

```css
@media (prefers-color-scheme: dark) {
  [data-theme="auto"] {
    /* 同 [data-theme="dark"] 的所有覆盖 */
  }
}
```

技巧：把深色样式写成一个 mixin 类 `dark-vars`，让 `[data-theme="dark"]` 和 `@media (...) { [data-theme="auto"] }` 共用。或者直接复制一份（CSS 无 mixin，保持简单）。

## 3. JS 实现

### 初始化（页面加载时立即执行，避免闪白）

在 `<head>` 中内联一段立即执行脚本（不放在 app.js 中，因为 module 有延迟）：

```html
<script>
  (function() {
    var t = localStorage.getItem('theme') || 'auto';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

### 切换逻辑（app.js）

```javascript
function setTheme(mode) {
  localStorage.setItem('theme', mode);
  document.documentElement.setAttribute('data-theme', mode);
  updateThemeButtons();
}

function getTheme() {
  return localStorage.getItem('theme') || 'auto';
}
```

## 4. UI — "我的"页面顶部

在激励数字上方放一排切换按钮：

```
[☀️] [🔄] [🌙]          ← 三个 icon 按钮，选中态高亮

🔥 连续学习 5 天
📚 累计学习 328 次
...
```

### HTML

```html
<div class="theme-switcher" id="theme-switcher">
  <button class="theme-btn" data-theme="light" title="浅色">☀️</button>
  <button class="theme-btn" data-theme="auto" title="跟随系统">🔄</button>
  <button class="theme-btn" data-theme="dark" title="深色">🌙</button>
</div>
```

### 样式

```css
.theme-switcher {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0 4px;
}
.theme-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--card-bg);
  font-size: 20px;
  cursor: pointer;
  transition: all .2s;
}
.theme-btn.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(74,144,217,0.3);
}
```

## 5. 代码改动

| 文件 | 改动 |
|------|------|
| `index.html` | `<head>` 内联主题初始化脚本；page-me 顶部加 theme-switcher HTML |
| `css/style.css` | `[data-theme="dark"]` 覆盖 + `@media` 跟随系统 + `.theme-switcher` 样式 |
| `js/app.js` | `setTheme()` / `getTheme()` / `updateThemeButtons()`；switchTab('me') 时更新按钮状态 |
| `sw.js` | bump 版本 |

## 6. 测试

### 手动验证
- [ ] 默认跟随系统（手机切换深色模式，页面跟随）
- [ ] 手动切浅色 → 固定浅色
- [ ] 手动切深色 → 固定深色
- [ ] 切回跟随系统 → 恢复跟随
- [ ] 所有页面（复习/添加/词库/我的/设置）深色下无白块
- [ ] 卡片翻转深色下正常
- [ ] 助记区域深色下可读
- [ ] Toast/Dialog 深色下正常
- [ ] 刷新后主题保持（localStorage 持久化）
- [ ] 首次加载无闪白（内联脚本生效）

---

**预计工作量**: Opus sub-agent 1 轮
