# 📇 单词闪卡 PWA

简洁高效的英语单词闪卡应用。输入单词 → AI 自动生成学习卡片 → 离线复习。

**👉 [立即使用](https://hongfeixu.github.io/flashcard-pwa/)**

## ✨ 功能

- **AI 生成卡片** — 输入单词，自动生成音标、释义、例句（MiniMax AI）
- **闪卡复习** — 3D 翻转卡片，标记认识/不认识，复习统计
- **词库管理** — 查看所有单词，切换掌握状态，删除
- **离线可用** — 数据存在本地 IndexedDB，复习不需要网络
- **移动端优先** — 针对手机屏幕优化，可添加到桌面

## 📱 使用方法

1. 打开 [应用链接](https://hongfeixu.github.io/flashcard-pwa/)
2. 点击 **📋 词库** → 右上角 **⚙️** → 输入 MiniMax API Key → 保存
3. 点击 **➕ 添加** → 输入英文单词 → 生成 → 保存
4. 点击 **📚 复习** → 点卡片翻转 → 认识✅ / 不认识❌

## 🔑 API Key

本应用使用 [MiniMax 开放平台](https://platform.minimaxi.com) API，需要自行注册获取 API Key。

## 技术栈

纯前端 PWA，零框架，使用 IndexedDB + Service Worker + MiniMax AI API。

📖 详细技术选型见 [技术栈文档](docs/architecture/tech-stack.md)

## 项目结构

```
flashcard-pwa/
├── index.html, manifest.json, sw.js    # PWA 核心
├── css/, js/                           # 样式 + 业务逻辑
├── docs/                               # 📚 技术文档（见下方）
├── scripts/                            # 🔧 工具脚本
├── worker/                             # ☁️ Cloudflare Workers
└── vocab.enc                           # 🔐 加密词汇库
```

完整结构说明见 [本地开发环境](docs/development/setup.md#目录结构)

## 📚 文档导航

### 新手入门
- [本地开发环境](docs/development/setup.md) — 如何在本地运行
- [部署指南](docs/development/deployment.md) — GitHub Pages + Workers 部署

### 技术架构
- [技术栈选型](docs/architecture/tech-stack.md) — 为什么用这些技术
- [数据流设计](docs/architecture/data-flow.md) — 数据如何流转
- [MiniMax API 集成](docs/architecture/minimax-api.md) — API 调用示例与最佳实践
- [词汇加密方案](docs/architecture/encryption.md) — AES-256-GCM 加密原理

### 开发参考
- [踩坑经验](docs/development/lessons-learned.md) — 常见问题解决方案
- [代码审查修复](docs/development/code-review-fixes.md) — 质量改进记录
- [功能路线图](docs/planning/roadmap.md) — 未来计划

### 变更日志
- [CHANGELOG](CHANGELOG.md) — 版本历史
