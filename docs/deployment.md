# 部署与故障排查

## 一键部署

1. 在 [README](../README.md) 中点击 **Deploy to Cloudflare Workers**。
2. 登录 Cloudflare，选择账户并确认 Worker 名称。
3. 确认部署流程创建了以下 bindings：
   - D1：`DB`
   - Durable Object：`VPS_PRESENCE` → `VpsPresence`
   - Durable Object：`DASHBOARD_HUB` → `DashboardHub`
4. 在 **Settings → Variables and Secrets** 中设置 `ADMIN_PASSWORD`。
5. 重新部署，打开 Worker 地址并使用用户名 `admin` 登录。

管理员和住宅代理应使用不同的独立强密码。修改 Variables、Secrets 或 Bindings 后必须重新部署。

## 手动部署

### 1. 准备环境

```bash
git clone https://github.com/yuanlam/kui-workers-pro.git
cd kui-workers-pro
npm ci
npx wrangler login
```

### 2. 创建 D1

```bash
npx wrangler d1 create kui-worker-db
```

将输出的 `database_id` 写入本地 `wrangler.jsonc`，不要提交到公开仓库：

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "kui-worker-db",
    "database_id": "替换为你的 database_id"
  }
]
```

`DB` 是固定 binding 名称。项目会在首次相关 API 请求时自动创建表结构，不需要单独执行 SQL migration；登录仅初始化认证表，其余结构按需批量初始化。

### 3. 设置 Secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put PROXY_USER
npx wrangler secret put PROXY_PASS
```

后两项仅在使用住宅代理时需要。

### 4. 部署

```bash
npx wrangler deploy --name my-kui-worker
```

部署后检查实时服务：

```bash
curl -fsS https://你的-worker-域名/health
```

后续更新执行 `git pull` 和 `npx wrangler deploy`。手动部署不会自动创建或修改 GitHub 仓库。

## 自定义域名

在 Worker 的 **Settings → Domains & Routes → Add** 中绑定域名或子域名，完成后直接使用该域名访问面板。

## 故障排查

### 页面空白、Hello World 或 1101

1. 在 **Settings → Bindings** 确认 D1 binding 名称为 `DB`。
2. 确认 `VPS_PRESENCE` 和 `DASHBOARD_HUB` 两个 Durable Objects bindings 存在。
3. 必要时添加兼容性标志 `assets_navigation_prefer_worker` 并重新部署。
4. 在 **Quick Edit** 中确认运行代码来自当前仓库的 `src/worker.js`。

### 登录按钮无响应

1. 确认部署的是仓库 `main` 分支最新版本。新版按钮会显示“登录中”，15 秒后会明确提示超时。
2. 确认 `ADMIN_PASSWORD` Secret 和 `DB` binding 均已配置。
3. 重新部署后强制刷新浏览器，避免继续使用旧 Worker Assets。
4. 在开发者工具 Network 中检查 `/api/login`：

| 状态 | 含义 |
| --- | --- |
| `200` | 登录成功 |
| `401` | 用户名或密码错误 |
| `429` | 失败次数过多，等待 15 分钟 |
| `503` | 未配置 `ADMIN_PASSWORD` |
| 超时 | 通常仍在运行旧版本，或 `DB` binding 异常 |

### 使用已有 D1

在 Worker 的 **Settings → Bindings** 中将 `DB` 重新绑定到目标数据库并部署。不要修改 binding 名称。
