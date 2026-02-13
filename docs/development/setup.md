# 本地开发环境搭建

## 前置要求

- Node.js 14+ （运行加密脚本）
- Python 3.7+ （本地开发服务器）
- Git （版本管理）

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/HongfeiXu/flashcard-pwa.git
cd flashcard-pwa
```

### 2. 启动本地服务器

```bash
python3 proxy.py
```

**端口**: 8080  
**访问**: http://localhost:8080/ 或 http://127.0.0.1:8080/

⚠️ **注意**: 必须用 `localhost` 或 `127.0.0.1`，不能用 `192.168.x.x`，因为 Web Crypto API 需要安全上下文。

### 3. 配置 API Key

打开应用 → 点击 **📋 词库** → 右上角 **⚙️** → 输入 MiniMax API Key → 保存

获取 API Key: https://platform.minimaxi.com

## 开发工作流

### 修改前端代码

编辑 `js/app.js`、`css/style.css` 等文件后：

1. **刷新浏览器** (推荐在 Chrome DevTools 启用 "Update on reload")
2. **或清除缓存** (Ctrl+Shift+Delete)

### 更新 Service Worker

修改 `sw.js` 后需要更新版本号：

```bash
bash scripts/bump-sw.sh
```

或手动修改 `sw.js` 中的 `CACHE_VERSION`。

### 本地测试词汇同步

1. 编辑 `vocab.json` 添加测试词汇
2. 加密：`node scripts/encrypt-vocab.js`
3. 刷新页面，点击"同步经济学人词汇"

## 调试技巧

### Chrome DevTools 设置

1. **F12** 打开 DevTools
2. **Application** → **Service Workers** → 勾选 **Update on reload**
3. **Application** → **Storage** → **IndexedDB** 查看数据库
4. **Application** → **Cache Storage** 查看缓存文件

### 常见问题

**Q: 修改代码后没生效？**  
A: Service Worker 缓存了旧版本，勾选 "Update on reload" 或手动 Unregister SW。

**Q: `crypto.subtle is undefined`？**  
A: 你用的是 `http://192.168.x.x`，改成 `http://localhost:8080`。

**Q: IndexedDB 报错？**  
A: 隐私模式下 IndexedDB 不可用，用正常模式。

## 目录结构

```
flashcard-pwa/
├── index.html          # 主入口
├── manifest.json       # PWA 配置
├── sw.js              # Service Worker
├── css/
│   └── style.css      # 样式
├── js/
│   ├── app.js         # 主逻辑
│   ├── api.js         # API + 解密
│   ├── db.js          # IndexedDB
│   └── tts.js         # TTS 发音
├── scripts/
│   ├── encrypt-vocab.js   # 加密工具
│   └── bump-sw.sh        # 版本号更新
└── proxy.py           # 本地开发服务器
```
