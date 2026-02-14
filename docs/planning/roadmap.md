# 功能路线图

> **文件说明**: 已完成功能（Phase 1-3）、计划中功能、技术债务  
> **最后更新**: 2026-02-13  
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

## 🚀 计划中

### Phase 4.5: Vitest 单元测试基础设施

**目标**: 建立单元测试框架，为 SRS 纯逻辑开发提供自动化测试保障

**详细方案**: [docs/development/vitest-unit-testing-setup.md](../development/vitest-unit-testing-setup.md)

**子任务**:
- [ ] 安装 Vitest + jsdom
- [ ] 从 app.js 抽取纯逻辑到 `lib/` 模块（esc, safeStr, friendlyError, validateWord, shuffle）
- [ ] app.js 改为 import lib 模块（功能不变）
- [ ] 为 lib 模块编写单元测试
- [ ] 为 api.js 可测函数编写测试（parseAIResponse, sanitizeWord, LRU cache, friendlyApiError）
- [ ] 为 db.js 编写测试（fake-indexeddb）
- [ ] 配置 `npm test` 命令
- [ ] 验证所有测试通过 + 浏览器功能不受影响

**优先级**: 高（SRS 开发前置依赖）

---

### Phase 5: SRS 间隔重复复习系统

**目标**: 基于遗忘曲线的智能复习系统，每日固定配额，答错重试机制

**详细方案**: [docs/development/srs-review-strategy.md](../development/srs-review-strategy.md)（v1.1 已确认）

**核心参数**:
- 4 级熟练度（level 0-3），间隔 1/3/7/30 天
- 连续答对 2 次升级，新词到掌握约 82 天
- 每日配额 10/20/30/40/50 可调，新词上限为配额 50%
- 答错不降级，放回队列直到答对

**子阶段**:

#### Phase 5.1：核心逻辑
- [ ] 数据结构调整（删除旧字段，新增 SRS 字段）
- [ ] 每日选词算法（到期优先 + 新词补充）
- [ ] 答题逻辑（答对升级 / 答错保持 / 重试放回）
- [ ] 今日任务持久化（localStorage 队列 + 进度）
- [ ] 复习页 UI 改造（进度条 + 完成页 + 再来一轮）
- [ ] 设置页添加每日配额选择（当天生效）
- [ ] 跨午夜检测 & 重新生成任务

#### Phase 5.2：统计增强
- [ ] 词库页显示 level 星星（⭐）
- [ ] 学习统计（连续天数、level 分布、正确率）
- [ ] 困难词标记（totalReviews 高但 level 低）

#### Phase 5.3：体验优化
- [ ] 学习曲线可视化
- [ ] 成就系统（连续学习 N 天）
- [ ] 复习提醒（OpenClaw cron → Telegram）

**优先级**: 高（下一个实现目标）

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
