# 部署与故障排查

## 推荐：Cloudflare 一键部署

新用户应优先使用一键部署，无需克隆仓库、安装 Wrangler 或手动创建 Cloudflare 资源。

1. 在 [README](../README.md) 中点击 **Deploy to Cloudflare Workers**。
2. 登录 Cloudflare，选择账户并确认部署。
3. 部署完成后，在 Worker 的 **Settings → Variables and Secrets** 中添加 `ADMIN_PASSWORD`，类型选择 **Secret**。
4. 打开 Worker 地址，使用用户名 `admin` 和刚设置的密码登录。

如需住宅代理，再添加 `PROXY_USER` 和 `PROXY_PASS` 两个 Secret。管理员和代理凭据应使用不同的独立强密码。

## 变量与内置配置

### 用户需要设置的 Secrets

| 配置 | 何时需要 | 说明 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 必需 | 管理员登录密码，无默认值 |
| `PROXY_USER` | 使用住宅代理时 | SOCKS5 用户名，需与 `PROXY_PASS` 同时设置 |
| `PROXY_PASS` | 使用住宅代理时 | SOCKS5 密码，需与 `PROXY_USER` 同时设置 |

### 用户可调变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `PROXY_PUBLIC_LISTENER` | `false` | 新 VPS 的公网监听默认值，面板中的单 VPS 设置优先 |

这些变量已有安全默认值，一键部署后通常无需修改。`PROXY_PUBLIC_LISTENER` 建议保持 `false`。

### 高级兼容变量

| 变量 | 使用场景 |
| --- | --- |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | Telegram 通知的环境变量回退配置，通常直接在面板设置 |
| `TG_WEBHOOK_SECRET` | 校验 Telegram Webhook 请求 |
| `CRON_SECRET` | 保护外部调用的 `/api/cron_check`；内置 Cron 不需要 |
| `REALTIME_URL` | 对接旧版分离实时服务；集成部署不需要 |
| `REALTIME_AUTH_SECRET` | 旧版分离实时服务的专用认证 Secret，Worker 与 Realtime 两端保持一致且至少 32 字符 |
| `PROXY_CTRL_URL` / `PROXY_CTRL_USER` / `PROXY_CTRL_PASS` / `PROXY_CTRL_TOKEN` | 对接外部住宅代理控制器；内置控制器不需要 |

### 系统内置资源

以下内容由 `wrangler.jsonc` 定义，一键部署时自动处理，不是在 **Variables and Secrets** 中填写的环境变量。

| 名称 | 类型 | 用途 |
| --- | --- | --- |
| `DB` | D1 Binding | 业务数据库 |
| `ASSETS` | Worker Assets Binding | 静态前端和 VPS 安装文件 |
| `VPS_PRESENCE` | Durable Object Binding | VPS 实时状态 |
| `DASHBOARD_HUB` | Durable Object Binding | 面板实时推送 |
| `*/5 * * * *` | Cron Trigger | 每 5 分钟检查离线状态 |

这些 binding 名称属于代码接口，使用已有资源时也不要改名。只有部署异常时才需要到 **Settings → Bindings** 核对它们。

## 开发者手动部署

仅在需要本地开发、命令行管理或自定义仓库时使用本节。普通用户请使用一键部署。

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

后续更新执行 `git pull` 和 `npx wrangler deploy`。仓库已启用 `keep_vars: true`，更新同一个 Worker 时会保留 Dashboard 中未写入配置文件的变量。手动部署不会自动创建或修改 GitHub 仓库。

## 更新现有部署

- 通过 Cloudflare 连接 Git 仓库部署：在 Cloudflare Dashboard 中触发最新提交的构建。
- 通过命令行部署：拉取最新代码后运行 `npm ci` 和 `npx wrangler deploy`。
- 更新前确认目标 Worker 名称与原实例一致，避免意外创建第二个实例。
- 常规更新不会删除已保存的 Secrets；不要把真实凭据写入 `wrangler.jsonc`。

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
