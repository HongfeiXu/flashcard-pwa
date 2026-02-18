# CHANGELOG - 单词闪卡 PWA 开发变更日志

> **说明**: 本文档记录版本变更历史。完整开发路线图见 [roadmap.md](docs/planning/roadmap.md)

---

## 2026-02-18 — 助记功能 + 模型升级

### 新增
- 💡 **Phase 5.5**: 助记功能
  - 复习页"💡 助记"按钮，AI 生成记忆方法（词根/谐音/画面/同根词）
  - 结果缓存到 IndexedDB，二次点击免调 API
  - 简易 Markdown 渲染（标题/加粗/斜体/引用块/无序列表/分隔线）
  - 首行基本信息自动裁剪（不与卡片内容重复）

### 架构
- 提取 `callAPI()` 共享函数（generateCard + generateMnemonic 复用）
- `renderMnemonicText` 独立模块 `lib/markdown.js` + 12 个测试（总计 104）

### 配置
- 默认模型 Sonnet 4.5 → 4.6

---

## 2026-02-15 — SRS 间隔重复 + "我的" Tab

### 新增
- 🧪 **Phase 4.5**: Vitest 单元测试（92 tests: utils 23 + api 25 + db 10 + srs 34）
- 🧠 **Phase 5.1**: SRS 间隔重复算法（`lib/srs.js`）
  - 4 级熟练度，间隔 1/3/7/30 天，连续答对 2 次升级
  - 每日选词（到期优先 + 新词补满，无新词上限）
  - 答错放回队列重试，首次答题更新 DB，重试仅影响队列
  - 今日任务持久化 + 跨午夜自动重置
  - 设置页配额选择（10/20/30/40/50）
- ⭐ **Phase 5.2**: 词库页 SRS 信息条 + 困难词标记 🔴
- 👤 **Phase 5.3**: "我的" Tab
  - 7 天学习活动条（纯 CSS 柱状图）
  - 激励数字（🔥连续天数 + 📚累计次数）
  - 词汇概览 + 今日进度
  - 设置入口迁移到"我的"页面

### 修复
- 🐛 7 天活动条时区 bug（`toISOString` → `toLocaleDateString` Asia/Shanghai）
- 🐛 `updateStudyStreak`/`recordInteraction`/`formatMMDD` 时区统一
- 🐛 重置应用时清理统计相关 localStorage

### 架构
- 纯逻辑抽取到 `lib/utils.js`（esc, safeStr, friendlyError, validateWord, shuffle）
- SRS 算法独立模块 `lib/srs.js`（processAnswer 为纯函数）
- api.js 补充 export（parseAIResponse, sanitizeWord, friendlyApiError）

---

## 2026-02-13 — 文档重整

### 新增
- 📚 完整技术文档体系（architecture/ development/ planning/ specs/）
- 📖 10 个踩坑经验总结 ([lessons-learned.md](docs/development/lessons-learned.md))
- 🔍 三轮代码审查修复记录 ([code-review-fixes.md](docs/development/code-review-fixes.md))

### 优化
- 消除文档冗余，建立清晰引用关系
- 文件名语义化（一眼知道内容）

---

## 2026-02-13 — 词汇加密

### 新增
- 🔐 vocab.json → vocab.enc 加密（AES-256-GCM）
- 🤖 经济学人 cron 自动加密流程
- 📝 加密方案文档 ([encryption.md](docs/architecture/encryption.md))

### 修复
- Web Crypto API 安全上下文问题（必须用 localhost）

---

## 2026-02-13 — 代码质量提升（三轮审查）

### 安全性
- XSS 防护全覆盖（正则版 `esc()` + 属性转义）
- 输入校验（类型 + 长度 + prompt injection 防御）

### 健壮性
- 错误处理统一化（ERROR_MESSAGES 映射）
- 防御性编程（existingWords 防空、QuotaExceeded 捕获）
- IndexedDB 重试逻辑

### 性能
- DocumentFragment 批量渲染（避免大词库卡顿）
- LRU 缓存减少重复 API 调用

### 用户体验
- 自定义 toast/confirm 替代原生 alert（PWA 友好）
- 复习进度保留（切 tab 不重置）
- TTS 双触发修复

**详见**: [code-review-fixes.md](docs/development/code-review-fixes.md)

---

## 阶段性里程碑

### Phase 1-3: 核心功能 (2026-02-12~13)
- ✅ MVP 核心（添加/复习/词库）
- ✅ 公网部署（Workers + Pages）
- ✅ PWA 完整支持（离线可用）
- ✅ 经济学人词汇联动（加密同步）
- ✅ 健壮性提升（三轮代码审查）

**详细进度**: [功能路线图](docs/planning/roadmap.md)

---

## 技术变更记录

### 2026-02-13
- 词汇加密方案上线（vocab.enc, AES-256-GCM）
- 代码质量提升（9/10，三轮审查）
- 文档体系重整（architecture/ development/ planning/）

### 2026-02-12
- 项目初始化
- MVP 核心功能完成
- Cloudflare Workers CORS 代理部署
