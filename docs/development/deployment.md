# 部署指南

## GitHub Pages 部署

### 首次部署

1. **推送代码到 GitHub**

```bash
git add -A
git commit -m "Initial commit"
git push origin main
```

2. **启用 GitHub Pages**

- 进入仓库 Settings → Pages
- Source: Deploy from a branch
- Branch: `main` / `(root)`
- 点击 Save

3. **等待部署完成** (~1-2 分钟)

访问: `https://<username>.github.io/flashcard-pwa/`

### 更新部署

每次 push 到 `main` 分支，GitHub Pages 自动重新部署。

```bash
git add -A
git commit -m "Update feature"
git push
```

## Cloudflare Workers 部署

### 为什么需要 Workers？

MiniMax API 不支持浏览器直接调用（CORS preflight 返回 403），需要代理。

### 部署步骤

1. **登录 Cloudflare Dashboard**

https://dash.cloudflare.com

2. **创建 Worker**

- Workers & Pages → Create application → Create Worker
- 名称: `flashcard-api-proxy`

3. **编辑代码**

粘贴 `worker/index.js` 的内容，点击 **Deploy**

4. **配置 CORS**

确保 `ALLOWED_ORIGINS` 包含你的 GitHub Pages 域名：

```js
const ALLOWED_ORIGINS = [
  'https://hongfeixu.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];
```

5. **获取 Worker URL**

例如: `https://flashcard-api-proxy.icevmj.workers.dev`

6. **更新前端配置**

修改 `js/api.js` 中的 `PROXY_BASE`：

```js
const PROXY_BASE = IS_LOCAL
  ? '/api'
  : 'https://flashcard-api-proxy.icevmj.workers.dev';
```

### 注意事项

- Workers 免费版每天 100,000 次请求
- 超出限制需升级付费版（$5/月）
- Worker 代码更新后立即生效（无需等待）

## 域名绑定（可选）

### 自定义域名

如果你有自己的域名，可以：

1. GitHub Pages 绑定自定义域名
2. Cloudflare Workers 绑定 Route

详见 GitHub 和 Cloudflare 官方文档。

## 部署检查清单

部署前确认：

- [ ] `sw.js` 版本号已更新
- [ ] `vocab.enc` 是最新的（`node scripts/encrypt-vocab.js`）
- [ ] Worker URL 配置正确
- [ ] 所有本地测试通过
- [ ] 没有 `console.log` 或调试代码残留
