# 功能路线图

> **文件说明**: 已完成功能（Phase 1-3）、计划中功能、技术债务  
> **最后更新**: 2026-02-15  
> 
> **相关文档**:
> - [CHANGELOG](../../CHANGELOG.md) — 技术变更历史
> - [代码审查记录](../reviews/) — 三轮审查修复记录

---

## ✅ 已完成

### Phase 1: MVP 核心
- [x] Tab 导航 + 页面切换
- [x] IndexedDB CRUD 封装
- [x] 添加页 + MiniMax API 集成
- [x] 复习页（3D 翻卡）
- [x] 词库页列表展示
- [x] LRU 缓存（100 词）

### Phase 1.5: 公网部署
- [x] Cloudflare Workers CORS 代理
- [x] GitHub Pages 部署
- [x] 本地/生产环境自动切换

### Phase 2: 体验完善
- [x] PWA 配置（SW + manifest + 图标）
- [x] 设置页 + 导入导出
- [x] TTS 发音（复习页 + 词库页）
- [x] 动画 & UI 打磨

### Phase 2.5: 经济学人联动
- [x] 词库同步按钮
- [x] vocab.json → vocab.enc 加密
- [x] Cron 自动追加词汇
- [x] 例句 TTS

### Phase 3: 健壮性
- [x] 错误处理完善
- [x] iOS Safari 兼容
- [x] 输入验证
- [x] 三轮代码审查修复

### Phase 4: 文档完善
- [x] 项目结构重整
- [x] 技术文档分类
- [x] 踩坑经验整理

---

### Phase 4.5: Vitest 单元测试基础设施 ✅
- [x] Vitest + jsdom + fake-indexeddb
- [x] 纯逻辑抽取到 `lib/utils.js`
- [x] 92 个测试（utils 23 + api 25 + db 10 + srs 34）

### Phase 5: SRS 间隔重复复习系统

**详细方案**: [docs/development/srs-review-strategy.md](../development/srs-review-strategy.md)

#### Phase 5.1：核心逻辑 ✅
- [x] SRS 算法（`lib/srs.js`）：4 级间隔、连续答对 2 次升级
- [x] 每日选词（到期优先 + 新词补满 + 无新词上限）
- [x] 答题逻辑 + 答错重试（首次更新 DB，重试仅影响队列）
- [x] 今日任务持久化 + 跨午夜重置
- [x] 复习页 UI 改造 + 设置页配额选择

#### Phase 5.2：统计增强 ✅
- [x] 词库页 SRS 信息条（复习次数、连对、上次/下次日期）
- [x] 困难词标记 🔴（totalReviews ≥6 且 level ≤1）

#### Phase 5.3："我的" Tab ✅
- [x] 第 4 个 Tab "我的"（复习 | 添加 | 词库 | 我的）
- [x] 学习记录持久化（interactions，30 天滚动）
- [x] 7 天活动条（纯 CSS 柱状图）
- [x] 激励数字（🔥连续天数 + 📚累计次数）
- [x] 词汇概览 + 今日进度
- [x] 设置入口迁移到"我的"
- [x] Code review + 时区 bug 修复

---

## 🚀 计划中

#### Phase 5.5：助记功能
- [ ] 复习页翻卡后显示"💡 助记"按钮
- [ ] AI 生成记忆方法（词根拆词/谐音联想/画面联想/同根词串记）
- [ ] 结果缓存到 IndexedDB（mnemonic 字段）
- [ ] 展示区可收起/展开

#### Phase 5.4：体验优化（待规划）
- [ ] 成就系统（连续学习 N 天徽章）
- [ ] 学习日历热力图
- [ ] 复习提醒（OpenClaw cron → Telegram）

### Phase 6: 多端同步 (可选)

**目标**: 多设备数据同步

**方案选项**:
1. **GitHub Gist** — 导出 → 手动上传 Gist → 其他设备导入
2. **自建后端** — Firebase / Supabase
3. **WebDAV** — 支持坚果云、Nextcloud

**优先级**: 中（目前导入导出 JSON 已可手动同步）

### Phase 7: 词汇分组标签 (可选)

**目标**: 按主题/来源分类词汇

- [ ] 添加 `tags` 字段
- [ ] 词库页支持筛选
- [ ] 按 tag 复习

**优先级**: 低

### Phase 8: 生词本浏览器扩展 (可选)

**目标**: 网页划词 → 自动添加到词库

- [ ] Chrome Extension
- [ ] 右键菜单"添加到闪卡"
- [ ] 自动提取上下文作为例句

**优先级**: 低

---

## 🤔 待评估

- **发音练习模式** — 录音 + 语音识别打分
- **单词拼写测试** — 听音拼写
- **AI 生成助记法** — 联想记忆、词根词缀
- **每日打卡 Streak** — 激励机制

---

## 📝 技术债务

无重大技术债务。

**小优化点**:
- [ ] proxy.py 可以用 Node.js 重写（统一工具链）
- [ ] SW 缓存策略可以考虑 Workbox（目前手写够用）
- [ ] 图标生成脚本 JS/Python 二选一即可

---

## 维护计划

- 每周检查 MiniMax API 是否有变化
- 每月更新依赖（Node.js / Python）
- 关注 Service Worker / IndexedDB 浏览器兼容性更新

---

**更新时间**: 2026-02-14
