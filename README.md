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
