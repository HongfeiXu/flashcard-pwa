# 技术栈选型

> **相关文档**:
> - [数据流设计](data-flow.md) — 了解各技术如何配合
> - [MiniMax API 集成](minimax-api.md) — API 调用示例与最佳实践

---

## 前端

### 核心技术
- **纯 HTML/CSS/JavaScript** — 零框架，轻量极致
- **IndexedDB** — 本地持久化存储，支持大量词汇
- **Service Worker** — 离线缓存，PWA 核心
- **Web Crypto API** — AES-256-GCM 加密解密

### 为什么不用框架？
1. **体积** — React/Vue 打包后至少 100KB+，纯 JS 仅 20KB
2. **性能** — 移动端直接操作 DOM，无虚拟 DOM 开销
3. **学习成本** — 任何懂 JS 的人都能维护
4. **PWA 兼容** — 不需要复杂的构建配置

## 后端服务

### MiniMax AI API
- **端点**: `https://api.minimaxi.com/anthropic/v1/messages`
- **兼容格式**: Anthropic Messages API
- **模型**: `MiniMax-M2.1-lightning`（默认）
- **功能**: 根据单词生成音标、释义、例句

### Cloudflare Workers
- **作用**: API CORS 代理
- **端点**: `https://flashcard-api-proxy.icevmj.workers.dev`
- **原因**: MiniMax API 不支持浏览器直接调用（CORS preflight 403）
- **部署**: 通过 Cloudflare Dashboard 手动部署

### GitHub Pages
- **托管**: 静态文件 + vocab.enc
- **URL**: `https://hongfeixu.github.io/flashcard-pwa/`
- **优势**: 免费、CDN、HTTPS、自动部署

## 数据存储

### 本地（浏览器）
- **IndexedDB** — 单词卡片（离线可用）
- **localStorage** — API Key、LRU 缓存（100 词）、同步时间戳

### 远程（GitHub）
- **vocab.enc** — 加密后的经济学人词汇库
- **静态资源** — HTML/CSS/JS/图标

## 开发工具

- **Node.js** — 加密脚本、图标生成
- **Python** — 本地开发代理、词汇提取
- **Git** — 版本管理
- **OpenClaw** — 经济学人文章生成 + 词汇自动化
