# 词汇加密方案 (AES-256-GCM)

> **文件说明**: vocab.json 的 AES-256-GCM 加密方案，防止 GitHub 上明文暴露敏感例句  
> **最后更新**: 2026-02-13  
> 
> **相关文档**:  
> - [数据流设计](data-flow.md) — 词汇同步流程  
> - [经济学人 Cron](.../.../MEMORY.md#经济学人双语学习系统) — 自动追加词汇

---

## 目的
防止 GitHub 上明文暴露经济学人例句中的敏感内容（政治人物、军事事件等）。

## 方案
- **算法**: AES-256-GCM（认证加密，防篡改）
- **密钥**: 硬编码 256-bit hex（见下方）
- **格式**: `Base64( IV[12字节] + Ciphertext + AuthTag[16字节] )`
- **安全级别**: 防爬虫/扫描/随意浏览，非防专业攻击（密钥在 JS 中公开）

## 密钥
```
a3f1b2c4d5e6f708192a3b4c5d6e7f80a1b2c3d4e5f60718293a4b5c6d7e8f90
```
同时存在于：
- `encrypt-vocab.js` (Node.js 加密端)
- `js/api.js` → `VOCAB_KEY_HEX` (浏览器解密端)

更换密钥需同步修改两处。

## 文件流
```
vocab.json (明文，本地保留，.gitignore)
    ↓ node encrypt-vocab.js
vocab.enc (密文，提交到 git)
    ↓ PWA fetch + Web Crypto API 解密
JSON 数组 (内存中使用)
```

## 加密（服务端 / CI）
```bash
cd flashcard-pwa
node encrypt-vocab.js              # vocab.json → vocab.enc
git add vocab.enc && git commit && git push
```

## 解密（浏览器端）
```js
import { decryptVocab } from './api.js';
const raw = await fetch('vocab.enc').then(r => r.text());
const vocabList = await decryptVocab(raw);  // JSON 数组
```

## 经济学人 Cron 流程
1. 追加词汇到 `vocab.json`
2. 执行 `node encrypt-vocab.js` 生成 `vocab.enc`
3. `git add vocab.enc` (不 add vocab.json)
4. commit + push

## 注意事项
- 每次加密会生成随机 IV，所以同一 vocab.json 多次加密产出不同 vocab.enc（正常）
- Web Crypto API 要求 HTTPS 或 localhost（GitHub Pages / 本地 proxy 都满足）
- vocab.json 保留在本地作为源文件，方便 cron 追加
