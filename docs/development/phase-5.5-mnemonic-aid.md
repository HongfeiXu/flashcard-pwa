# Phase 5.5: 助记功能

> **目标**: 复习页新增"助记"按钮，调用 AI 生成记忆方法，帮助用户记住单词  
> **创建日期**: 2026-02-16  
> **依赖**: Phase 5.3 ✅

---

## 1. 交互流程

```
翻卡（看到背面释义）
  → 认识/不认识 按钮上方出现 [💡 助记] 按钮
  → 点击 → 按钮变 "⏳ 生成中..."（disabled）
  → AI 返回 → 卡片下方展开助记区域（卡片外、按钮上方）
  → 已有缓存 → 直接展示，不调 API
  → 再次点击按钮 → 收起/展开 toggle
  → 切到下一张卡 → 助记区域自动清除
```

## 2. AI 调用

### 接口
复用现有 MiniMax API（`api.js` 中的 `API_URL`、`getApiKey()`、`getModel()`）。

### 新函数：`generateMnemonic(word)`

```javascript
async function generateMnemonic(word) {
  // 复用 getApiKey(), getModel(), API_URL, friendlyApiError
  // system prompt 见下方
  // 返回纯文本（不是 JSON）
  // 超时 30s
}
```

### System Prompt

```
你是一个英语词汇记忆助手，面向中文母语者。当用户给出一个英文单词时，请按以下结构组织回复：

1. 基本信息：单词、音标、核心中文释义，简洁一行。
2. 记忆方法（至少提供两种，灵活选用）：
   ∙ 词根拆词法：拆解前缀、词根、后缀，追溯拉丁/希腊语源，讲清构词逻辑。
   ∙ 谐音联想法：利用发音与中文的相似性，构建生动画面。
   ∙ 画面联想法：创造一个具体、夸张、有情感的场景帮助记忆。
   ∙ 同根词串记：列出共享同一词根的常见单词，形成记忆网络。
3. 常见搭配与例句：给出 2-3 个真实常用的搭配或例句，附中文翻译，帮助用户理解语境和用法。
4. 记忆锚点总结：最后用一句话点明最核心的记忆抓手，让用户带走一个关键印象。

注意事项：
∙ 语言风格轻松自然，不要学术化。
∙ 联想要具体生动，避免抽象空洞的解释。
∙ 优先选择对中文母语者最直觉的记忆路径。
∙ 用加粗标记关键词和词根，方便视觉扫描。
∙ 如果单词有有趣的词源故事，可以简要提及。
```

### User Message

```
${word}
```

### 响应处理
- 直接取 `content[0].text` 作为纯文本
- 不做 JSON 解析
- 去掉 `<think>` 标签（MiniMax 可能返回）

## 3. 缓存策略

### IndexedDB 字段
在卡片对象中新增 `mnemonic` 字段：

```javascript
{
  word: "cantankerous",
  // ... 现有字段 ...
  mnemonic: "Cantankerous /kænˈtæŋkərəs/ ..."  // AI 生成的助记文本，null = 未生成
}
```

### 逻辑
1. 点击助记 → 先查 `currentCard.mnemonic`
2. 有缓存 → 直接显示
3. 无缓存 → 调 API → 存入 IndexedDB（`putCard`）→ 显示

### 迁移
`migrateCard()` 中无需处理，`mnemonic` 不存在时自然为 `undefined`，按无缓存走。

## 4. UI 设计

### 助记按钮位置
```
┌─────────────────────┐
│     [卡片背面]       │
│  word / phonetic     │
│  definition          │
│  example             │
└─────────────────────┘

[❌ 不认识]  [✅ 认识]   ← 原有按钮不变

[💡 助记]                ← 单独一行，居中

┌─────────────────────┐  ← 助记展示区（默认隐藏，按钮下方）
│  助记内容...         │
│  （可滚动）          │
└─────────────────────┘
```

### 助记展示区样式
```css
.mnemonic-area {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
  font-size: 14px;
  line-height: 1.8;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;      /* 保留换行 */
  animation: fadeIn 0.3s;
}
```

### 按钮样式
```css
.btn-mnemonic {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: 20px;
  padding: 8px 20px;
  font-size: 14px;
  cursor: pointer;
}
.btn-mnemonic:disabled {
  opacity: 0.6;
}
```

## 5. 代码改动

| 文件 | 改动 |
|------|------|
| `js/api.js` | 新增 `generateMnemonic(word)` 函数 + export |
| `js/app.js` | `showCard()` 中翻卡后渲染助记按钮；点击逻辑；缓存读写 |
| `css/style.css` | `.mnemonic-area` + `.btn-mnemonic` 样式 |
| `sw.js` | bump 版本 |

## 6. 错误处理

- 无 API Key → `请先在设置中输入 API Key`
- 网络失败 → `网络连接失败，请检查网络后重试`
- API 错误 → 复用 `friendlyApiError()`
- 展示区显示错误信息 + 重试按钮

## 7. 测试

### 单元测试（tests/api.test.js 新增）
- `generateMnemonic` 的 mock 测试（可选，涉及 fetch mock 较重）

### 手动验证
- [ ] 翻卡后显示助记按钮
- [ ] 点击生成 → loading → 结果展示
- [ ] 二次点击同一词 → 直接从缓存显示（无 loading）
- [ ] 收起/展开 toggle
- [ ] 切下一张卡 → 助记区域清除
- [ ] 无 API Key 时提示
- [ ] 网络失败时提示 + 重试

---

**预计工作量**: Opus sub-agent 1 轮
