# 数据流设计

> **文件说明**: 6 个核心业务流程图（添加单词、复习、同步、Cron、SW 缓存、数据持久化）  
> **最后更新**: 2026-02-13  
> 
> **相关文档**:
> - [技术栈选型](tech-stack.md) — 了解每个组件的作用
> - [词汇加密方案](vocab-encryption-aes256.md) — vocab.enc 加解密细节

---

## 1. 添加单词流程

```
用户输入 "armada"
    ↓
validateWord() 校验（字母/长度/特殊字符）
    ↓
检查 IndexedDB 是否已存在
    ↓
检查 LRU 缓存（localStorage）
    ↓ (未缓存)
fetch API (通过 Cloudflare Workers 代理)
    ↓
MiniMax AI 生成 JSON
    ↓
parseAIResponse() 容错解析
    ↓
showPreview() 显示预览卡片
    ↓
用户点击"保存"
    ↓
addCard() 写入 IndexedDB
    ↓
setCachedCard() 写入 LRU 缓存
```

## 2. 复习流程

```
switchTab('review')
    ↓
initReview()
    ↓
getAllCards() 从 IndexedDB 读取
    ↓
filter(c => !c.mastered) 筛选未掌握
    ↓
shuffle() 随机排序
    ↓
showCard() 渲染当前卡片
    ↓
用户点击卡片 → 3D 翻转
    ↓
点击"认识" → putCard({mastered: true})
点击"不认识" → 放回队列末尾
    ↓
reviewQueue.length === 0 → 显示统计
```

## 3. 经济学人词汇同步流程

```
用户点击"同步经济学人词汇"
    ↓
fetch('https://hongfeixu.github.io/flashcard-pwa/vocab.enc')
    ↓
decryptVocab() 解密（Web Crypto API）
    ↓
getAllCards() 获取本地已有词汇
    ↓
构建 existingWords Set（小写去重）
    ↓
逐条检查 vocab 中的词：
    - 已存在 → skipped++
    - 不存在 → 加入 newCards 数组
    ↓
bulkImport(newCards) 批量写入 IndexedDB
    ↓
localStorage.setItem('lastVocabSync', timestamp)
    ↓
showToast('新增 X 个，跳过 Y 个')
```

## 4. 经济学人 Cron 自动化流程

```
每天 12:00 (Asia/Shanghai)
    ↓
Opus 生成双语文章
    ↓
提取 10 个重点词汇（含 example_cn）
    ↓
读取 vocab.json（本地明文）
    ↓
追加新词（按 word 去重）
    ↓
写回 vocab.json
    ↓
执行 node scripts/encrypt-vocab.js
    ↓
生成 vocab.enc（AES-256-GCM 加密）
    ↓
git add vocab.enc && git commit && git push
    ↓
GitHub Pages 自动部署（~1-2 分钟）
    ↓
用户下次同步即可获取
```

## 5. Service Worker 缓存策略

```
Static Assets (HTML/CSS/JS/图标)
    → Cache First (离线可用)

vocab.enc
    → Network First (优先拉取最新，失败时回退缓存)

API 请求
    → Network Only (不缓存，实时调用)
```

## 6. 数据持久化层次

```
Level 1: IndexedDB (主存储)
    - 所有卡片数据
    - 支持离线
    - 容量大 (~50MB+)

Level 2: localStorage (辅助存储)
    - API Key
    - LRU 缓存（100 个最近生成的卡片）
    - 同步时间戳
    - 容量小 (~5MB)

Level 3: Service Worker Cache (静态资源)
    - HTML/CSS/JS
    - vocab.enc (Network First)
    - 离线访问
```
