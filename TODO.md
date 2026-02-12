# 单词闪卡 PWA - 开发进度

## 第一阶段：MVP 核心 ✅ (2026-02-12)
- [x] 基础框架 + Tab 导航 + 页面切换
- [x] IndexedDB 封装（CRUD）
- [x] 添加页 + MiniMax API 调用
- [x] 复习页（翻卡 + 认识/不认识）
- [x] 词库页列表展示
- [x] LRU 缓存（100 词，避免重复 API 调用）
- [x] JSON 解析容错（中文引号、markdown 包裹、think 标签）
- [x] 防重复调用（预览阶段锁定 + 输入变化解锁 + 相同单词跳过）

## 第 1.5 阶段：公网部署 ✅ (2026-02-13)
- [x] Cloudflare Workers API 代理 (flashcard-api-proxy.icevmj.workers.dev)
- [x] 前端 API 地址适配（本地 vs 生产自动切换）
- [x] GitHub Pages 部署 (hongfeixu.github.io/flashcard-pwa)
- [x] 验证外网可用

## 第二阶段：体验完善 ✅ (2026-02-13)
- [x] PWA 配置（Service Worker + manifest + 图标）
- [x] 设置页 + 导入导出 + 清空数据
- [x] TTS 发音（复习页 + 词库页）
- [x] 动画 & UI 打磨（fade-in、touch feedback、spinner）
- **验收：** 可装桌面、离线复习、发音、体验流畅

## 第三阶段：健壮性
- [ ] 错误处理完善
- [ ] CORS 问题处理（如需 Cloudflare Workers 代理）
- [ ] iOS Safari 兼容性测试修复
- **验收：** 边界情况稳定

---
## 开发日志

### 2026-02-12
- 项目初始化，清理 git 分支（保留 main）
- 创建开发文档，开始第一阶段
- Phase 1 MVP 完成（Opus sub-agent，2m24s）
- CORS 问题：MiniMax API preflight 403 → 本地 proxy.py 解决
- 多轮 bug 修复：JSON 解析容错、防重复调用、LRU 缓存

### 2026-02-13
- Phase 1.5 公网部署完成：Cloudflare Workers + GitHub Pages
- 用户验收通过，开始第二阶段
