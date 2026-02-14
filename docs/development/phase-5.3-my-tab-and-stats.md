# Phase 5.3: "我的" Tab + 学习统计

> **目标**: 新增第 4 个 Tab "我的"，整合学习统计、level 分布，为后续功能提供容器  
> **创建日期**: 2026-02-15  
> **依赖**: Phase 5.2 ✅

---

## 1. Tab 栏改造

### 现有
```
复习  |  添加  |  词库
```

### 改为
```
复习  |  添加  |  词库  |  我的
```

- Tab icon/文字：`👤 我的` 或纯文字 `我的`
- Tab id: `me`
- Page id: `page-me`

### 设置页入口变化
- **现在**：词库页右上角 ⚙️ 按钮进设置
- **改后**："我的" Tab 底部有 `⚙️ 设置` 按钮进设置，词库页 ⚙️ 按钮移除
- 设置页返回按钮改为回到"我的"页面

---

## 2. 数据存储

### 每日学习记录（localStorage `studyHistory`）

```javascript
// 数组，保留最近 30 天，超出自动清理
[
  {
    date: "2026-02-15",        // YYYY-MM-DD
    interactions: 42,           // 总点击次数（认识+不认识，含重试）
    correct: 28,                // 首次答对数
    wrong: 14                   // 首次答错数
  },
  ...
]
```

### 更新时机
- 每次用户点击 ✅认识 或 ❌不认识 时：`interactions++`
- 首次答题时额外更新 `correct` 或 `wrong`（已有逻辑）
- 在 app.js 复习答题逻辑中添加 `recordInteraction()` 调用

### 清理策略
- 每次写入时检查，删除 30 天前的记录
- 避免 localStorage 无限膨胀

---

## 3. "我的" 页面布局

```
┌─────────────────────────┐
│  🔥 连续学习 5 天         │
│  📚 累计学习 328 次       │
│                         │
│  ── 最近 7 天 ──────────  │
│                         │
│  一  二  三  四  五  六  日│
│  ██  ██  ▓▓  ░░  ██  ██  ▓▓│
│  42  38  21   3  35  40  18│
│                         │
│  ── 词汇概览 ──────────  │
│                         │
│  总词数 30               │
│  新词 5 · 初识 8 · 熟悉 10│
│  巩固 5 · 掌握 2          │
│  ✅ 总正确率 73%          │
│  🔴 困难词 3 个           │
│                         │
│  ── 今日 ──────────────  │
│                         │
│  今日：8/10（对6 错2）    │
│                         │
│  [⚙️ 设置]               │
└─────────────────────────┘
```

---

## 4. 7 天活动条（纯 CSS）

### 实现方式
- 7 个 `<div>` 柱子，高度按 `interactions` 比例计算
- 最高的柱子 = 100%，其余按比例缩放
- 最小高度 4px（即使 0 次也有个底）
- 柱子下方显示具体数字
- 柱子上方显示星期几

### 样式
```css
.chart-bar-group {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 120px;
  padding: 0 8px;
}

.chart-bar {
  width: 28px;
  background: linear-gradient(to top, #4CAF50, #81C784);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s;
}

.chart-bar.today {
  background: linear-gradient(to top, #2196F3, #64B5F6);
}
```

### 颜色区分
- 普通天：绿色
- 今天：蓝色（高亮）
- 无数据天：灰色极短柱

---

## 5. 核心激励数字

### 🔥 连续学习天数
- 复用 Phase 5.2 已有的 `studyStreak`（localStorage）
- 大字显示

### 📚 累计学习次数
- 从 `studyHistory` 所有记录的 `interactions` 求和
- 加上超过 30 天已清理的历史 → 需要一个 `totalInteractions` 计数器（localStorage）
- 每次 interaction 时同时 `totalInteractions++`

### ✅ 总正确率
- `所有记录的 correct 之和 / (correct + wrong) 之和`
- 同理需要 `totalCorrect` 和 `totalWrong` 累计计数器
- 无数据时显示 `--`

---

## 6. 设置页瘦身

### 从设置页移除
- level 分布统计（移到"我的"）
- 连续学习天数（移到"我的"）
- 原有的 `settings-stats` 简化为一行：`共 N 个单词`

### 设置页保留
- API Key 配置
- 模型选择
- 每日配额
- 导入/导出
- 清空词库/重置应用

### 词库页保留
- 词汇列表
- 📰 同步经济学人词汇按钮（不移动，留在词库页）

---

## 7. index.html 改动

### 新增 Tab 按钮
```html
<button class="tab-btn" data-tab="me">我的</button>
```

### 新增 Page
```html
<div class="page" id="page-me">
  <!-- 激励数字 -->
  <div class="me-header">
    <div class="me-streak">🔥 连续学习 <span id="me-streak-count">0</span> 天</div>
    <div class="me-total">📚 累计学习 <span id="me-total-count">0</span> 次</div>
  </div>

  <!-- 7 天活动条 -->
  <div class="me-section">
    <div class="me-section-title">最近 7 天</div>
    <div class="chart-bar-group" id="me-chart"></div>
  </div>

  <!-- 词汇概览 -->
  <div class="me-section">
    <div class="me-section-title">词汇概览</div>
    <div id="me-vocab-stats"></div>
  </div>

  <!-- 今日 -->
  <div class="me-section">
    <div class="me-section-title">今日</div>
    <div id="me-today-stats"></div>
  </div>

  <!-- 设置入口 -->
  <div class="me-section">
    <button class="btn btn-secondary" id="btn-me-settings">⚙️ 设置</button>
  </div>
</div>
```

---

## 8. 代码改动清单

| 文件 | 改动 |
|------|------|
| `index.html` | 新增 Tab 按钮 + page-me HTML |
| `css/style.css` | .me-header, .me-section, .chart-bar-group, .chart-bar 样式 |
| `js/app.js` | 新增 renderMe() 函数；答题时调 recordInteraction()；设置入口改到"我的"；switchTab 支持 'me' |
| `sw.js` | bump 版本 |

---

## 9. 测试

### 纯逻辑可测（可选，加到 tests/）
- `recordInteraction()` 的累加和日期切换
- `getWeekData()` 返回最近 7 天数据
- 30 天清理逻辑

### 手动验证
- [ ] 4 个 Tab 正常切换
- [ ] "我的"页面数据正确
- [ ] 7 天活动条高度比例正确
- [ ] 连续学习天数正确
- [ ] 复习后数字实时更新
- [ ] 设置页从"我的"进入/返回正常
- [ ] 词库页 ⚙️ 按钮已移除

---

**预计工作量**: Opus sub-agent 1 轮
