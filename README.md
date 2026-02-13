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

- 纯 HTML + CSS + JavaScript（无框架）
- IndexedDB 本地持久化
- MiniMax AI API（Anthropic 兼容格式）
- Cloudflare Workers（API CORS 代理）
- GitHub Pages（静态托管）
- AES-256-GCM 词汇加密（防 GitHub 明文敏感内容）

## 项目结构

```
flashcard-pwa/
├── src/                    # 源代码
│   ├── index.html         # 主入口
│   ├── manifest.json      # PWA 配置
│   ├── sw.js             # Service Worker
│   ├── css/style.css     # 样式
│   └── js/               # 业务逻辑
│       ├── app.js        # 主逻辑（UI、Tab、复习、词库）
│       ├── api.js        # MiniMax API + 词汇解密
│       ├── db.js         # IndexedDB CRUD
│       └── tts.js        # TTS 发音封装
├── docs/                  # 技术文档
│   ├── SPEC.md           # 完整功能规格
│   └── CRYPTO.md        # 词汇加密方案
├── scripts/              # 工具脚本
│   ├── encrypt-vocab.js  # 加密 vocab.json → vocab.enc
│   ├── extract-vocab.py  # 从 economist outputs 提取词汇
│   └── bump-sw.sh       # 自动更新 SW 版本
├── worker/               # Cloudflare Workers
│   └── index.js          # API CORS 代理
├── data/                 # 数据文件
│   ├── vocab.json        # 明文源文件（本地保留，.gitignore）
│   └── vocab.enc         # 加密后文件（git 追踪）
└── CHANGELOG.md         # 开发变更日志
```

## 相关文档

- [完整规格](docs/SPEC.md)
- [词汇加密方案](docs/CRYPTO.md)
- [开发变更日志](CHANGELOG.md)
