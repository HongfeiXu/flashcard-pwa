# Phase 4.5: Vitest 单元测试基础设施

> **目标**: 建立单元测试框架，模块化抽取纯逻辑，为 SRS 开发提供自动化测试保障  
> **创建日期**: 2026-02-14

---

## 1. 技术选型

| 工具 | 用途 | 说明 |
|------|------|------|
| **Vitest** | 测试框架 | 零配置、原生 ESM、快速 |
| **jsdom** | 浏览器环境模拟 | Vitest 内置支持 |
| **fake-indexeddb** | IndexedDB mock | db.js 测试需要 |

## 2. 模块化重构

### 2.1 从 app.js 抽取到 `lib/utils.js`

以下纯函数从 app.js 移到独立模块：

```js
// lib/utils.js
export function esc(s) { ... }           // HTML 转义
export function safeStr(val, maxLen) { ... }  // 字段清洗
export function friendlyError(err) { ... }     // 错误信息映射
export function validateWord(input) { ... }    // 输入验证
export function shuffle(arr) { ... }           // Fisher-Yates 洗牌
```

### 2.2 app.js 改为 import

```js
import { esc, safeStr, friendlyError, validateWord, shuffle } from './lib/utils.js';
```

### 2.3 api.js 已有 export

已可测函数：
- `parseAIResponse(data)` — AI 响应解析 + JSON 修复
- `sanitizeWord(word)` — 输入清洗
- `friendlyApiError(status, body)` — API 错误映射
- `getCachedCard(word)` / `setCachedCard(word, data)` — LRU 缓存
- `decryptVocab(base64Data)` — AES-256-GCM 解密

**注意**: LRU 缓存和 decryptVocab 需要特殊处理：
- LRU 依赖 `localStorage` → jsdom 环境自带
- decryptVocab 依赖 `crypto.subtle` → Node 20+ 自带 `globalThis.crypto`

### 2.4 db.js 测试

使用 `fake-indexeddb` 替代真实 IndexedDB：
```js
import 'fake-indexeddb/auto';
// 之后 db.js 的 indexedDB 调用会走 fake 实现
```

## 3. 目录结构

```
flashcard-pwa/
├── js/
│   ├── lib/
│   │   └── utils.js          ← 新增：从 app.js 抽取的纯逻辑
│   ├── app.js                ← 修改：import lib/utils.js
│   ├── api.js                ← 不变（已有 export）
│   ├── db.js                 ← 不变
│   └── tts.js                ← 不变（浏览器 API 重，不测）
├── tests/
│   ├── utils.test.js         ← lib/utils.js 测试
│   ├── api.test.js           ← api.js 可测函数
│   └── db.test.js            ← db.js CRUD 测试
├── vitest.config.js          ← Vitest 配置
└── package.json              ← 新增 devDependencies + test script
```

## 4. 测试用例清单

### 4.1 utils.test.js

| 函数 | 测试点 |
|------|--------|
| `esc()` | null/空字符串、HTML 特殊字符（`<>&"'`）、正常文本不变 |
| `safeStr()` | null → 空串、超长截断、数字转字符串 |
| `friendlyError()` | 已知 key 映射、未知错误 fallback、null 输入 |
| `validateWord()` | 空输入、超长、含数字/中文、正常单词、带连字符/撇号 |
| `shuffle()` | 长度不变、元素不变（排序后相等）、空数组 |

### 4.2 api.test.js

| 函数 | 测试点 |
|------|--------|
| `sanitizeWord()` | 正常单词、大写转小写、含数字拒绝、超长拒绝、空输入 |
| `friendlyApiError()` | 401/402/429/500/403/其他状态码 |
| `parseAIResponse()` | 正常 JSON、```json 包裹、尾逗号修复、中文引号修复、无 text block |
| `getCachedCard/setCachedCard` | 缓存命中/未命中、LRU 淘汰（>100）、命中后提升优先级 |
| `decryptVocab()` | 正常解密、损坏数据抛错 |

### 4.3 db.test.js

| 函数 | 测试点 |
|------|--------|
| `addCard/getCard` | 添加后能查到、重复添加报错 |
| `putCard` | 更新已有卡片 |
| `deleteCard` | 删除后查不到 |
| `getAllCards` | 空库返回 []、多卡返回全部 |
| `clearAll` | 清空后 getAll 返回 [] |
| `bulkImport` | 批量导入、去重 |

## 5. 配置文件

### vitest.config.js

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
});
```

### package.json 变更

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.x",
    "fake-indexeddb": "^6.x"
  }
}
```

## 6. 注意事项

- **app.js import 路径**: 浏览器端 `import './lib/utils.js'` 需要完整后缀（ESM 规范）
- **api.js 内部函数**: `parseAIResponse`、`sanitizeWord`、`friendlyApiError` 目前未 export，需补充 export
- **LRU 测试隔离**: 每个测试前清空 `localStorage`
- **db.js 测试隔离**: 每个测试前 `clearAll()` 或重建数据库
- **crypto.subtle**: Node 20+ 全局可用，Vitest 默认支持
- **SW 缓存版本**: 代码改动后记得 bump SW 版本

## 7. 验收标准

1. `npm test` 全部通过（绿色）
2. 浏览器端功能无回归（手动快速验证：翻卡、添加、词库、设置）
3. GitHub Pages 部署正常
4. 测试覆盖核心纯逻辑函数 ≥ 90%

---

**预计工作量**: Opus sub-agent 1 轮（~30min）
