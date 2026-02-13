# CHANGELOG - 单词闪卡 PWA 开发变更日志

## 项目结构重整 ✅ (2026-02-13)

```
flashcard-pwa/
├── src/                    # 源代码
│   ├── index.html         # 主入口
│   ├── manifest.json      # PWA 配置
│   ├── sw.js             # Service Worker
│   ├── css/style.css     # 样式
│   └── js/               # 业务逻辑
│       ├── app.js        # 主逻辑
│       ├── api.js        # API + 解密
│       ├── db.js         # IndexedDB
│       └── tts.js        # 发音
├── docs/                  # 技术文档
│   ├── SPEC.md           # 完整规格
│   └── CRYPTO.md        # 词汇加密方案
├── scripts/              # 工具脚本
│   ├── encrypt-vocab.js  # 加密工具
│   ├── extract-vocab.py  # 词汇提取
│   └── bump-sw.sh       # SW 版本更新
├── worker/               # Cloudflare Workers
├── data/                 # 数据文件
│   ├── vocab.json        # 明文（本地）
│   └── vocab.enc         # 密文（git）
└── CHANGELOG.md         # 变更日志
```

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

## 第 2.5 阶段：经济学人词汇联动 ✅ (2026-02-13)
- [x] 词库页「📰 同步经济学人词汇」按钮 + loading + 上次同步时间
- [x] 从 GitHub Pages 拉取 vocab.json，逐条去重导入 IndexedDB
- [x] 复习页/词库页例句 🔊 朗读按钮
- [x] SW vocab.json Network First 策略，CACHE_VERSION → v2
- [x] Cron 追加词汇 → git push，自动同步到 PWA

### 词汇同步流程
```
经济学人 cron（每天 12:00）
  → 生成文章 + 提取 10 个词汇（含 example_cn）
  → 追加到 vocab.json
  → vocab.json → vocab.enc（加密）
  → git add vocab.enc → push

用户点击「📰 同步经济学人词汇」
  → fetch vocab.enc → Web Crypto 解密
  → 逐条去重导入 IndexedDB
  → toast 显示"新增 X 个，跳过 Y 个"
```
- [x] 经济学人 cron prompt 增加例句中文翻译字段
- [x] 每篇文章生成时同时输出 vocab JSON + git push
- [x] 历史 20 词汇补翻译
- [x] 清空词库 vs 重置应用分离

## 第三阶段：健壮性 ✅ (2026-02-13)
- [x] 错误处理完善
  - [x] 网络异常：fetch 失败显示友好中文提示
  - [x] API 错误码区分：401/402/429/500 各有清晰提示
  - [x] IndexedDB 不可用：隐私模式友好提示
  - [x] 存储满：QuotaExceededError 捕获提示
  - [x] JSON 解析失败：已有容错 + 友好提示
  - [x] 空输入保护：验证英文字母/长度/特殊字符
  - [x] 所有 DB 操作 try-catch + 友好提示
- [x] iOS Safari 兼容性
  - [x] 键盘弹出时隐藏底部 tab bar（visualViewport resize）
  - [x] -webkit-backface-visibility / -webkit-transform-style-3d
  - [x] -webkit-overflow-scrolling: touch（卡片背面）
  - [x] safe-area-inset 适配（顶部 + 底部）
  - [x] PWA meta 标签已正确（apple-mobile-web-app-capable/status-bar-style）
  - [x] viewport width=device-width 消除 300ms 延迟
- [x] 通用体验优化
  - [x] 所有错误信息中文化/友好化
  - [x] 全局 toast 提示组件
  - [x] 词汇同步区分：网络错误 vs 404 不存在 vs 格式错误
  - [x] 导入文件 JSON 解析错误友好提示
- [x] CORS 问题已在 Phase 1.5 通过 Cloudflare Workers 解决
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
