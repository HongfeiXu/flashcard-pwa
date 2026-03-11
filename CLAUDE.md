# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

英语单词闪卡 PWA。用户输入单词 → MiniMax AI 生成学习卡片（音标、释义、例句、助记） → 间隔重复算法管理复习。支持离线使用。

## 常用命令

```bash
# 运行全部测试（5 个文件，104 个用例）
npm test

# 监听模式
npm run test:watch

# 运行单个测试文件
npx vitest run tests/srs.test.js

# 部署前更新 Service Worker 缓存版本
bash scripts/bump-sw.sh

# 加密词汇文件
node scripts/encrypt-vocab.js [input.json] [output.enc]

# 本地开发：启动 Python CORS 代理（端口 8080）
python proxy.py
```

无构建步骤、无打包工具、无 linter，文件直接由浏览器加载。

## 架构

**零框架 vanilla JS 单页应用**，使用 ES6 模块，浏览器直接加载。

### 模块依赖关系

```
index.html
  └── js/app.js（主控模块，~1150 行）
        ├── js/db.js          — IndexedDB 增删改查（FlashcardDB）
        ├── js/api.js         — MiniMax AI API 调用 + 响应解析 + 词汇解密
        ├── js/tts.js         — Web Speech API 语音朗读
        ├── js/lib/utils.js   — XSS 转义（esc）、输入校验（validateWord）
        ├── js/lib/srs.js     — 间隔重复算法（纯函数）
        └── js/lib/markdown.js — Markdown 转 HTML（助记内容渲染）
```

### Tab 导航

单个 `index.html` 包含 5 个页面，通过 CSS `.active` 类切换：
- **复习** — SRS 驱动的闪卡复习，3D 翻转动画
- **添加** — AI 生成卡片
- **词库** — 浏览/管理已保存单词
- **我的** — 学习统计与连续打卡
- **设置** — API Key、模型选择、主题、数据导入导出

### 状态管理（3 层）

| 层级 | 存储 | 内容 |
|------|------|------|
| IndexedDB (`FlashcardDB`) | 持久化 | 卡片对象：word, phonetic, pos, definition, example, example_cn, mnemonic, SRS 字段（level, correctStreak, nextReviewDate, mastered） |
| localStorage | 持久化 | API Key (`minimax_api_key`)、模型、主题、每日配额、LRU 卡片缓存（100 条）、学习历史（30 天）、连续天数 |
| 运行时变量 | 会话级 | `currentCard`、`todayReview` 队列、`isFlipped`、`reviewActive` |

### API 代理架构

```
浏览器 → Cloudflare Worker (worker/index.js) → MiniMax API    （生产环境）
浏览器 → proxy.py (localhost:8080) → MiniMax API              （本地开发）
```

`js/api.js` 中的响应解析具有防御性：会剥离 markdown 代码围栏、`<think>` 标签、尾部逗号和 Unicode 引号后再 JSON.parse。

### Service Worker 缓存策略（sw.js）

- **静态资源** — Cache-first（HTML、CSS、JS、图标）
- **vocab.enc** — Network-first，失败回退缓存
- **API 请求** — Network-only（不缓存）

缓存版本号在 `sw.js` 第 3 行（`CACHE_VERSION`），部署前用 `scripts/bump-sw.sh` 更新。

### SRS 算法（js/lib/srs.js）

复习间隔：`[1, 3, 7, 30]` 天。连续答对 2 次升级。Level 4 = 已掌握。答错重置连续次数，次日重新复习。选词优先选过期词（按 level 排序）。

### 词汇加密流程

`scripts/extract-vocab.py` → `vocab.json` → `scripts/encrypt-vocab.js` → `vocab.enc`（AES-256-GCM，Base64 编码）。解密密钥硬编码在 `scripts/encrypt-vocab.js` 和 `js/api.js` 中。

## 测试

使用 **Vitest** + **jsdom** + **fake-indexeddb**。已开启 globals（无需手动 import `describe`、`it`、`expect`）。

- `tests/srs.test.js` — SRS 算法（34 个）
- `tests/api.test.js` — API 响应解析与错误处理（25 个）
- `tests/utils.test.js` — 校验、转义、洗牌（23 个）
- `tests/mnemonic.test.js` — Markdown 渲染（12 个）
- `tests/db.test.js` — IndexedDB 操作（10 个）

## 代码约定

- 所有面向用户的文本使用中文
- XSS 防护：向 HTML 插入动态内容时必须使用 `js/lib/utils.js` 中的 `esc()` 函数
- 私有函数以下划线开头：`_tx()`、`_wrapWrite()`、`_doSpeak()`
- app.js 中用注释分区：`// --- Theme switching ---`、`// --- Review page ---`
- 全面使用 async/await；API 调用通过 AbortController 设置 30 秒超时
- 直接 DOM 操作（innerHTML 配合转义内容、addEventListener）
- **每次修改前端文件（JS/CSS/HTML）后，必须运行 `bash scripts/bump-sw.sh` 更新 SW 缓存版本号**，否则用户刷新页面时会继续使用旧缓存

## 部署

GitHub Pages 托管静态文件。Cloudflare Workers（`worker/` 目录，通过 `wrangler` 部署）提供 CORS 代理。无 CI/CD，手动部署。
