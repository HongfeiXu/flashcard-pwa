# SRS 间隔重复复习策略

> 版本：v1.1
> 日期：2026-02-14
> 状态：方案确认，待实现（Phase 5）

---

## 一、核心理念

基于**艾宾浩斯遗忘曲线**，采用简化版间隔重复算法。

核心原则：
- 记住的单词，间隔逐渐拉长
- 忘记的单词，回到短间隔重新巩固
- 每天固定配额，完成即可休息
- 答错的单词今天必须答对才能离开
- 退出 App 不丢失今日进度

---

## 二、数据结构

### 单词卡片（IndexedDB）

```javascript
{
  word: "example",           // 主键
  phonetic: "/ɪɡˈzɑːmpl/",
  pos: "n.",
  definition: "例子；榜样",
  example: "This is an example.",
  example_cn: "这是一个例子。",

  // SRS 核心字段
  level: 0,                  // 熟练度 0-3
  correctStreak: 0,          // 连续答对次数（跨天累计）
  nextReviewDate: null,      // 下次复习日期 "YYYY-MM-DD"，null = 新词
  totalReviews: 0,           // 总复习次数（统计用）
  mastered: false,           // 完全掌握
  createdAt: timestamp,
  lastReviewedAt: null       // 上次复习时间戳
}
```

> 注：不保留旧字段（reviewCount, correctCount 等），开发期无兼容包袱。

### 今日任务（localStorage）

```javascript
{
  date: "2026-02-14",
  words: ["A", "B", "C", ...],      // 原始选中的单词列表（不变，用于统计）
  queue: ["D", "E", "B", ...],      // 当前复习队列（动态变化）
  firstAnswered: ["A", "B", "C"],   // 已经首次作答的单词
  correctCount: 3,                   // 首次答对数
  wrongCount: 2                      // 首次答错数
}
```

### 用户设置（localStorage）

```javascript
{
  dailyQuota: 10,                    // 每日配额，默认 10
  minimax_api_key: "...",            // API Key（保留）
  minimax_model: "..."               // 模型（保留）
}
```

---

## 三、等级与间隔

### 等级定义

| Level | 含义 | 答对后间隔 |
|-------|------|-----------|
| 0 | 新词 | 1 天 |
| 1 | 初识 | 3 天 |
| 2 | 熟悉 | 7 天 |
| 3 | 巩固 | 30 天 |

### 升级条件

- 在当前 level **连续答对 2 次** → level + 1
- 升级后 correctStreak 重置为 0

### 掌握条件

- level 3 连续答对 2 次 → `mastered = true`（不再出现在复习中）

### 完整路径（全部答对）

```
Level 0 → 1：2 × 1天  = 第 2 天升级
Level 1 → 2：2 × 3天  = 第 8 天升级
Level 2 → 3：2 × 7天  = 第 22 天升级
Level 3 → 掌握：2 × 30天 = 第 82 天掌握

从新词到完全掌握：约 82 天（2.7 个月）
```

### 常量

```javascript
const INTERVALS = [1, 3, 7, 30];  // 对应 level 0-3
const STREAK_TO_LEVEL_UP = 2;     // 连续答对 N 次升级
const MAX_LEVEL = 3;              // 最高等级
```

---

## 四、每日选词算法

### 参数

| 参数 | 值 | 备注 |
|------|-----|------|
| 每日配额 | 10 / 20 / 30 / 40 / 50 | 默认 10，设置页可调 |
| 新词上限 | Math.floor(配额 / 2) | 动态计算 |

| 配额 | 新词上限 |
|------|---------|
| 10 | 5 |
| 20 | 10 |
| 30 | 15 |
| 40 | 20 |
| 50 | 25 |

### 选词流程

```javascript
function selectTodayWords(allWords, quota) {
  const today = getTodayDate();
  const newWordLimit = Math.floor(quota / 2);

  // 1. 排除已掌握的
  const active = allWords.filter(w => !w.mastered);

  // 2. 分类
  const dueOld = active.filter(w =>
    w.nextReviewDate && w.nextReviewDate <= today
  );
  const newWords = active.filter(w => !w.nextReviewDate);

  // 3. 排序
  dueOld.sort((a, b) =>
    (a.level - b.level) || (a.lastReviewedAt - b.lastReviewedAt)
  );
  shuffle(newWords);

  // 4. 组合：到期优先 + 新词补充（受上限约束）
  let todayList = [...dueOld];
  if (todayList.length < quota) {
    const needed = Math.min(quota - todayList.length, newWordLimit);
    todayList.push(...newWords.slice(0, needed));
  }

  // 5. 截取配额
  todayList = todayList.slice(0, quota);

  // 6. 随机打乱最终顺序
  shuffle(todayList);

  return todayList.map(w => w.word);
}
```

### 优先级

1. **到期旧词**（nextReviewDate <= 今天）→ 最高优先
2. **新词**（nextReviewDate = null）→ 次优先，受新词上限约束
3. **未到期**（nextReviewDate > 今天）→ 不出现

---

## 五、答题逻辑

### ✅ 首次答对

```javascript
card.correctStreak++;
card.totalReviews++;
card.lastReviewedAt = Date.now();

if (card.correctStreak >= STREAK_TO_LEVEL_UP) {
  card.level++;
  card.correctStreak = 0;

  if (card.level > MAX_LEVEL) {
    card.mastered = true;
    card.nextReviewDate = null;
  } else {
    card.nextReviewDate = addDays(today, INTERVALS[card.level]);
  }
} else {
  card.nextReviewDate = addDays(today, INTERVALS[card.level]);
}
```

### ❌ 首次答错

```javascript
card.correctStreak = 0;
card.totalReviews++;
card.lastReviewedAt = Date.now();
card.nextReviewDate = addDays(today, 1); // 明天
// level 保持不变（不降级）
```

### 🔄 重试逻辑（答错后再次遇到）

```
首次答错后，单词放回队列末尾。再次遇到时：
  - 答对 → 从队列移除（不更新数据库，不累加 correctStreak）
  - 答错 → 继续放回队列末尾（不再更新数据库）

核心：第一次作答时"判分"并更新数据库，后续重试只影响队列，不影响 SRS 数据。
重试答对只是"今天的补考"，明天该词仍会出现（nextReviewDate 不变）。
```

### 判断是否首次作答

```javascript
const isFirstTime = !todayReview.firstAnswered.includes(word);

if (isFirstTime) {
  todayReview.firstAnswered.push(word);

  if (isCorrect) {
    todayReview.correctCount++;
    updateCardCorrect(card);  // 更新 IndexedDB
  } else {
    todayReview.wrongCount++;
    updateCardWrong(card);    // 更新 IndexedDB
    todayReview.queue.push(word); // 放回队列末尾
  }
} else {
  // 重试：不更新数据库
  if (isCorrect) {
    // 从队列移除（不放回）
  } else {
    todayReview.queue.push(word); // 继续放回
  }
}
```

---

## 六、每日任务流程

### 打开 App

```
1. 读取 localStorage.todayReview
2. 检查日期：
   - date !== 今天 → 生成新任务
   - date === 今天 且 queue 为空 → 显示"今日已完成"
   - date === 今天 且 queue 非空 → 继续未完成的任务
```

### 跨午夜处理

```
每次显示下一张卡片前，检查当前日期：
  - 如果日期变了（跨天）→ 提示"新的一天开始了"→ 重新生成任务
  - 不支持跨天继续旧任务
```

### 今日任务完成

```
🎉 今日任务完成！

📊 本次成绩：
  总数：10 个
  答对：8 个 ✅
  答错：2 个 ❌

明天继续加油！💪

[再来一轮]  [返回词库]
```

### "再来一轮"

- 重新调用 `selectTodayWords()` 生成新任务
- 覆盖当前 todayReview
- 可能选出不同的单词（已复习完的到期旧词不会再出现，可能选更多新词）
- 如果没有可选的单词 → 显示"今天没有更多需要复习的了，明天继续！"

### 配额调整当天生效

```
用户修改配额后：
  → 弹出确认："修改配额将重新生成今日任务，当前进度将重置。确定吗？"
  → 确认后：重新调用 selectTodayWords(新配额) 生成任务
  → 取消：不做任何改变
```

---

## 七、UI 变化

### 复习页

**改动**：
- 顶部显示进度：`今日任务：3 / 10`
- 进度条的分母是**实际选出的数量**（可能不足配额）
- 翻牌后选择 ✅ 认识 / ❌ 不认识
- 答错的单词稍后会再次出现（直到答对）
- 全部答对后显示完成统计
- 退出后再进来，继续未完成的任务

### 设置页

**新增复习设置区域**：
```
📊 复习设置

每日配额：
  [ 10 ] [ 20 ] [ 30 ] [ 40 ] [ 50 ]
  新词上限自动为配额的 50%（当前：5 个/天）
```

### 词库页

**改动**：
- 每个单词显示当前 level（用星星 ⭐ 表示）
  - ☆☆☆ = level 0
  - ⭐☆☆ = level 1
  - ⭐⭐☆ = level 2
  - ⭐⭐⭐ = level 3
  - 🏆 = mastered

### 完成页统计口径

- "答对 N 个"= **首次就答对**的数量
- "答错 N 个"= **首次答错**的数量（即使重试后答对了）
- 这样统计更真实地反映记忆状态

---

## 八、边界情况

| 场景 | 处理方式 |
|------|---------|
| 词库为空 | 显示"去添加第一个单词吧" |
| 全部已掌握 | 显示"所有单词已掌握！🎉" |
| 到期旧词超过配额 | 按优先级取前 N 个，其余自动推迟 |
| 到期旧词 + 新词不足配额 | 有多少算多少，进度条显示实际数量 |
| 退出 App 再打开 | 继续今日未完成的队列 |
| 跨午夜 | 重新生成新任务 |
| 复习中途添加新词/同步 | 今日任务不变，新词明天出现 |
| 复习中途删除某单词 | 从队列中跳过 |
| 同一单词一直答错 | 每天都会出现，直到答对 |
| 配额调整 | 当天生效（确认后重新生成） |
| "再来一轮"无可选单词 | 显示"今天没有更多了" |
| 一个单词今天答错多次 | 第一次更新数据库，后续仅影响队列 |

---

## 九、日期工具

```javascript
// 获取当前北京时间日期
function getTodayDate() {
  return new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai'
  }); // "YYYY-MM-DD"
}

// 日期加天数
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+08:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
```

---

## 十、实现分期

### Phase 5.1：核心逻辑（本次实现）
- [ ] 数据结构调整（删除旧字段，新增 SRS 字段）
- [ ] 每日选词算法
- [ ] 答题逻辑（答对 / 答错 / 重试放回）
- [ ] 今日任务持久化（队列 + 进度）
- [ ] 复习页 UI 改造（进度条 + 完成页 + 再来一轮）
- [ ] 设置页添加每日配额选择
- [ ] 跨午夜检测 & 重新生成

### Phase 5.2：统计增强
- [ ] 词库页显示 level 星星
- [ ] 学习统计（连续天数、level 分布、正确率）
- [ ] 困难词标记

### Phase 5.3：体验优化
- [ ] 学习曲线可视化
- [ ] 成就系统
- [ ] 复习提醒（OpenClaw cron → Telegram）

---

## 十一、参数汇总

| 参数 | 值 | 备注 |
|------|-----|------|
| 等级数 | 4（level 0-3） | |
| 升级条件 | 连续答对 2 次 | |
| 间隔 | 1 / 3 / 7 / 30 天 | 对应 level 0-3 |
| 掌握时间 | 约 82 天 | 全部答对的理想情况 |
| 每日配额 | 10 / 20 / 30 / 40 / 50 | 默认 10，设置页可调 |
| 新词上限 | 配额的 50% | 动态计算 |
| 答错策略 | 不降级，放回队列直到答对 | correctStreak 清零 |
| 重试规则 | 不更新数据库，不累加 correctStreak | 仅影响队列 |
| 配额调整 | 当天生效 | 确认后重新生成任务 |
| 跨午夜 | 重新生成任务 | 不延续旧任务 |
| 进度条分母 | 实际选出的数量 | 可能不足配额 |
| 完成页统计 | 首次作答结果 | 重试不计入统计 |
