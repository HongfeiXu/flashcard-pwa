# Phase 2.5：经济学人词汇联动方案

## 整体流程

```
经济学人 cron（每天 12:00）
  → Opus 生成双语文章（词汇表增加 example_cn 字段）
  → 提取词汇 → 追加到 vocab.json（去重）
  → git push（vocab.json 更新到 GitHub）
  → 发送 MD 文件到 Telegram

用户打开闪卡 PWA
  → 点击「📰 同步经济学人词汇」
  → 从 GitHub Pages 拉取 vocab.json
  → 逐条去重导入 IndexedDB
  → toast 提示"新增 X 个单词"
```

## 改动点

### 1. 经济学人 cron payload 调整
- 词汇表格式增加 `example_cn`（例句中文翻译）
- 生成文章后，同时输出词汇到 `vocab.json`
- vocab.json 格式：
```json
[
  {
    "word": "armada",
    "phonetic": "/ɑːˈmɑːdə/",
    "pos": "n.",
    "definition": "舰队；大批",
    "example": "Mr Trump has deployed a \"beautiful armada\" to the Middle East.",
    "example_cn": "特朗普向中东部署了一支"漂亮的舰队"。",
    "source": "economist-2026-02-12-trump-iran-conflict"
  }
]
```
- `source` 字段标记来源文章，方便追溯
- 追加逻辑：读取现有 vocab.json → 合并新词（按 word 去重）→ 写回

### 2. vocab.json 存放位置
- `/home/hongfei/.openclaw/workspace/flashcard-pwa/vocab.json`
- git push 后自动通过 GitHub Pages 提供：
  `https://hongfeixu.github.io/flashcard-pwa/vocab.json`

### 3. PWA 前端改动
- 词库页或设置页添加「📰 同步经济学人词汇」按钮
- 点击后 fetch vocab.json → 逐条检查 IndexedDB → 导入不存在的
- 显示结果：新增 X 个，跳过 Y 个已存在
- 记录 `localStorage.lastVocabSync` 时间戳，按钮旁显示上次同步时间

### 4. 历史词汇补录
- 已生成的文章（9 篇）中的词汇需要一次性提取到 vocab.json
- 可以写个脚本从 outputs/*.md 解析词汇表

## 文件变更清单
| 文件 | 操作 |
|------|------|
| vocab.json | 新增，词汇数据 |
| js/app.js | 添加同步按钮逻辑 |
| index.html | 添加同步按钮 UI |
| css/style.css | 同步按钮样式 |
| 经济学人 cron payload | 调整 prompt + 追加 vocab.json 逻辑 |

## 注意事项
- vocab.json 会随文章增多不断增长，但每篇约 8-10 个词，71 篇全做完也就 ~700 词，JSON 很小
- SW cache 策略：vocab.json 应该走 **Network First**（需要拿最新的），不能 Cache First
- 导入时 mastered 默认 false，createdAt 用导入时间
