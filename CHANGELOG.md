# CHANGELOG - 单词闪卡 PWA 开发变更日志

> **说明**: 本文档记录版本变更历史。完整开发路线图见 [roadmap.md](docs/planning/roadmap.md)

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
