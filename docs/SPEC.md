# SPEC: 单词闪卡 PWA

## 项目概述

纯前端单词闪卡 PWA。用户输入英文单词 → 调用 MiniMax AI API 自动生成学习卡片（音标、释义、例句）→ 本地缓存 → 离线复习。个人自用，不考虑后端。

## 技术栈

- 纯 HTML + CSS + JavaScript，不用任何框架
- IndexedDB 做本地持久化
- PWA：Service Worker + manifest.json
- AI：MiniMax 开放平台 API（Anthropic 兼容格式）

---

## MiniMax API 接入（关键）

### Endpoint 和模型

MiniMax 国内开放平台推荐使用 **Anthropic API 兼容格式**。前端用 fetch 直接调用：

```
POST https://api.minimaxi.com/anthropic/v1/messages
```

注意域名是 `api.minimaxi.com`（有个 i），不是 `api.minimax.chat`。

可用模型（任选其一，推荐 lightning 速度最快）：
- `MiniMax-M2.1-lightning` — 极速版，约 100tps（推荐）
- `MiniMax-M2.1` — 最强版，约 60tps
- `MiniMax-M2` — 上一代

### 调用示例

```javascript
const response = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'MiniMax-M2.1-lightning',
    max_tokens: 500,
    system: '你是一个专业的英语词典助手。只返回 JSON，不要返回任何其他内容，不要用 markdown 代码块包裹。',
    messages: [
      {
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
      }
    ]
  })
});

const data = await response.json();
```

### API 调用保护

- 请求超时：设置 30 秒 AbortController timeout，避免 API 卡住无响应
- 防重复点击：生成过程中禁用按钮，避免用户连续点击产生多次请求

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const response = await fetch(url, {
  ...options,
  signal: controller.signal
});
clearTimeout(timeoutId);
```

### 重要：解析 Anthropic 格式响应

Anthropic 格式的响应中，content 是一个数组，包含多种类型的 block。MiniMax M2.1 是推理模型，会返回 thinking block 和 text block。**只需要提取 type=text 的 block**：

```javascript
function parseAIResponse(data) {
  // 1. 从 content 数组中提取 text 类型的 block（跳过 thinking block）
  const textBlock = data.content.find(block => block.type === 'text');
  if (!textBlock) throw new Error('No text content in response');

  let text = textBlock.text.trim();
  // 2. 移除可能的 markdown 代码块标记
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  // 3. 解析 JSON
  return JSON.parse(text);
}
```

Anthropic 格式的好处是 thinking 内容天然与正文分离，不需要手动清理 `<think>` 标签。

### API Key 存储

- 用户首次打开 App 时，引导到设置页面输入 API Key
- 存入 `localStorage.setItem('minimax_api_key', key)`
- 输入框用 `type="password"` 样式
- 每次 API 调用前检查 key 是否存在，不存在则提示用户去设置

---

## 功能模块

### 1. 复习页（主页，tab: 📚 复习）

这是 App 的核心页面。

- 从 IndexedDB 取所有 `mastered === false` 的单词，随机打乱顺序
- 显示闪卡：
  - **正面**：大字显示单词 + 小喇叭图标（点击 TTS 发音）
  - **背面**：音标、词性、中文释义、英文例句、例句中文翻译
- 点击卡片 → 3D 翻转动画（Y 轴 180°，0.5s ease-in-out）
- 翻转后卡片下方出现两个按钮：
  - ✅ 认识 → 标记 `mastered = true`，进入下一张
  - ❌ 不认识 → `reviewCount++`，放回队列末尾，进入下一张
- 下一张卡片用淡入效果
- 全部复习完 → 显示本轮统计：总数、认识数、不认识数，和一个"再来一轮"按钮
- 没有待复习单词 → 显示空状态，引导去添加页

### 2. 添加页（tab: ➕ 添加）

- 一个输入框 + "生成卡片" 按钮
- 输入单词后点击按钮（或回车）：
  - 显示 loading 动画
  - 调 MiniMax API 生成卡片
  - 成功 → 预览生成的卡片内容，显示"保存"按钮
  - 保存后存入 IndexedDB
  - 如果单词已存在（主键冲突）→ 提示"该单词已在词库中"
  - API 失败 → 显示错误信息 + 重试按钮
- 支持连续添加（保存后自动清空输入框，焦点回到输入框）

### 3. 词库页（tab: 📋 词库）

- 列表显示所有单词，每行：单词、简短释义、状态标签（已掌握/待复习）
- 右上角齿轮图标 → 进入设置
- 每个单词可以：
  - 点击展开查看完整卡片内容
  - 删除（需确认）
  - 已掌握 ↔ 待复习 状态切换
- 顶部显示统计：共 X 个单词，已掌握 X，待复习 X

### 4. 设置页（从词库页齿轮进入）

- API Key 输入框（password 类型，有显示/隐藏切换）
- 模型选择下拉框，选项：
  - MiniMax-M2.1-lightning（默认）
  - MiniMax-M2.1
  - MiniMax-M2
- 词库统计总览
- 导出词库（导出为 JSON 文件下载）
- 导入词库（选择 JSON 文件导入，合并不覆盖）
- 清空所有数据（需二次确认对话框）
- 返回按钮

### 5. TTS 发音

- 使用 Web Speech API (`window.speechSynthesis`)
- 正面卡片的单词旁有 🔊 图标
- 点击后朗读单词
- 优先选择英语语音（en-US 或 en-GB）

---

## 数据结构

### IndexedDB

- 数据库名：`FlashcardDB`
- Object Store：`cards`，主键：`word`

### 单条卡片记录

```javascript
{
  word: "ubiquitous",          // 主键，唯一
  phonetic: "/juːˈbɪkwɪtəs/",
  pos: "adj.",
  definition: "无处不在的，普遍存在的",
  example: "Smartphones have become ubiquitous in modern life.",
  example_cn: "智能手机在现代生活中已变得无处不在。",
  mastered: false,             // 是否已掌握
  createdAt: 1707700000000,    // 添加时间（时间戳）
  reviewCount: 0,              // 被标记"不认识"的次数
  correctCount: 0,             // 被标记"认识"的次数（统计用）
  lastReviewedAt: null         // 最后复习时间（为未来间隔重复算法预留）
}
```

---

## UI 设计

### 整体风格

- 简洁、现代、iOS 风格
- 白色背景 + 深灰文字 + 蓝色主题色（#4A90D9）
- 圆角（12px）+ 轻阴影的卡片
- 字体：系统默认（-apple-system, BlinkMacSystemFont, sans-serif）

### 布局

- 底部固定导航栏，3 个 tab 图标 + 文字
- 移动端优先，body `max-width: 480px; margin: 0 auto`
- 内容区域有适当的 padding（16px）
- 安全区域适配：`padding-bottom: env(safe-area-inset-bottom)`

### 卡片样式

- 宽度 100%，高度约 300px - 400px，居中
- 正面：单词居中，大字号（32px+），下方小喇叭图标
- 背面：左对齐排列，音标（灰色）、词性+释义、例句、例句翻译
- 3D 翻转：用 CSS `perspective` + `transform: rotateY(180deg)` + `backface-visibility: hidden`
- 翻转动画建议使用 `cubic-bezier(0.4, 0, 0.2, 1)` 缓动函数，比 `ease-in-out` 更流畅
- `transform-style: preserve-3d` 确保 3D 效果正确

### 按钮

- "认识" 按钮：绿色背景
- "不认识" 按钮：红色/橙色背景
- 两个按钮并排，等宽，间距 12px
- 圆角、适当的 padding、触摸友好（min-height 48px）
- 所有可点击元素添加触摸反馈：`:active { transform: scale(0.95); opacity: 0.8; }`

---

## PWA 配置

### manifest.json

```json
{
  "name": "单词闪卡",
  "short_name": "闪卡",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#4A90D9",
  "description": "简洁高效的英语单词闪卡应用",
  "categories": ["education", "productivity"],
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (sw.js)

- 缓存静态资源（html, css, js, icons）— Cache First 策略
- API 请求（api.minimaxi.com）— Network Only，不缓存
- 离线时复习页正常工作（数据在 IndexedDB 中）
- 使用版本号管理缓存，更新时自动清除旧缓存：

```javascript
const CACHE_VERSION = 'v1';
const CACHE_NAME = `flashcard-${CACHE_VERSION}`;

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});
```

### 图标

- 用 Canvas 或 SVG 生成简单的图标即可（比如一个卡片 emoji 📇 风格）
- 或者直接用纯色背景 + 文字 "闪" 作为图标

---

## 文件结构

```
flashcard-pwa/
├── index.html          # 单页应用入口
├── css/
│   └── style.css       # 所有样式
├── js/
│   ├── app.js          # 主逻辑：路由、tab 切换、UI 渲染
│   ├── db.js           # IndexedDB CRUD 封装
│   ├── api.js          # MiniMax API 调用 + 响应解析
│   └── tts.js          # TTS 发音封装
├── sw.js               # Service Worker
├── manifest.json       # PWA manifest
├── icon-192.png        # PWA 图标
└── icon-512.png        # PWA 图标（大）
```

---

## 注意事项

1. **CORS**：MiniMax API 可能限制浏览器直接跨域请求。如果遇到 CORS 错误，在设置页显示明确的提示信息，告知用户需要后续添加代理。不要默默失败。如果 CORS 不通，备选方案是写一个 Cloudflare Workers 代理（免费额度每天 10 万次请求，几行代码即可）。
2. **JSON 解析容错**：AI 返回内容务必做清洗（去 think 标签、去 markdown 标记），然后 try-catch 解析。解析失败时让用户重试。
3. **单页应用路由**：不需要用 history API，直接用 JS 控制 DOM 显示/隐藏不同页面 section 即可，tab 切换时加 class。
4. **API Key 不硬编码**：代码中不出现任何 API Key，全部从 localStorage 读取。
5. **iOS Safari 兼容**：测试 `position: fixed` 底部导航栏在 iOS Safari 的表现，注意键盘弹出时的布局问题。添加页的输入框获得焦点时，确保不被键盘遮挡。
6. **导出/导入**：导出就是把 IndexedDB 所有记录 dump 成 JSON 下载。导入时逐条写入，已存在的单词跳过不覆盖。
7. **IndexedDB 不可用**：部分浏览器隐私模式可能禁用 IndexedDB，打开数据库失败时应显示友好提示，引导用户使用正常模式。
8. **加载状态**：添加页调用 API 时显示骨架屏或 spinner 动画，避免用户以为卡住了。

---

## 开发阶段规划

### 第一阶段（MVP，跑通核心）
1. 基础框架 + Tab 导航 + 页面切换
2. IndexedDB 封装（CRUD）
3. 添加页 + MiniMax API 调用（先测 CORS）
4. 复习页核心功能（翻转 + 认识/不认识）
5. 词库页列表展示

### 第二阶段（完善体验）
6. PWA 配置（Service Worker + manifest + 图标）
7. 设置页 + 导入导出
8. TTS 发音
9. UI 细节打磨 + 动画效果

### 第三阶段（优化健壮性）
10. 错误处理完善（网络异常、API 失败、存储满等）
11. 如遇 CORS 问题，添加 Cloudflare Workers 代理
12. iOS Safari 兼容性测试和修复
