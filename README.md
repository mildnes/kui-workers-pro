# KUI x Server Monitor Pro

> 本项目 Fork 自 [a6216abcd/K-UI-workers](https://github.com/a6216abcd/K-UI-workers)，并在此基础上持续维护。

KUI 是部署在单一 Cloudflare Worker 上的代理节点管理与服务器探针面板。Worker Assets 托管前端和 VPS 安装组件，D1 保存业务数据，Durable Objects 提供实时 WebSocket，无需单独部署面板服务器或 Realtime Worker。

## 推荐：Cloudflare 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yuanlam/kui-workers-pro)

无需购买服务器、克隆仓库、安装 Wrangler，也无需手动创建 D1 或 Durable Objects。点击按钮后，Cloudflare 会根据仓库配置创建 Worker 及其所需资源。

1. 点击上方 **Deploy to Cloudflare Workers**。
2. 登录 Cloudflare，选择账户并确认部署。
3. 部署完成后，进入 Worker 的 **Settings → Variables and Secrets**，添加 `ADMIN_PASSWORD`，类型选择 **Secret**。
4. 打开 Worker 地址，使用用户名 `admin` 和刚设置的密码登录。

如需使用住宅代理，再添加 `PROXY_USER` 和 `PROXY_PASS` 两个 Secret。项目不内置任何默认密码。

> 一键部署会在你的 GitHub 账号中创建项目副本，这是 Cloudflare 官方部署流程的正常行为。如果希望直接维护当前仓库，并在推送 `main` 后自动部署到 Cloudflare，请不要使用一键部署按钮；应在 Cloudflare 中手动创建 Worker（已有实例则直接复用），再连接当前 GitHub 仓库。创建和配置步骤见[连接现有 GitHub 仓库并自动部署](docs/deployment.md#连接现有-github-仓库并自动部署)。

## 核心能力

- VPS、代理节点、多用户、订阅令牌、流量配额和到期管理。
- CPU、内存、磁盘、网络、连接数和线路延迟实时探针。
- XTLS-Reality、Hysteria2、TUIC、Shadowsocks 2022、Trojan、AnyTLS 等协议。
- 普通链接、Mihomo/Clash 和 Surge 配置导出。
- 原生、WARP、住宅代理和手动 SOCKS5 出口。
- 实时状态同步、公开探针、Telegram 告警和定时离线检查。

## 配置说明

### 首次部署需要设置

以下敏感信息由用户在 Cloudflare Dashboard 中设置，不要写入代码或提交到仓库。

| 配置 | 类型 | 何时需要 | 用途 |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Secret | 必需 | 管理员登录密码，请使用独立强密码 |
| `PROXY_USER` / `PROXY_PASS` | Secret | 使用住宅代理时 | SOCKS5 认证凭据，两项必须同时设置 |

### 用户可调变量

这些普通变量均有默认值，一键部署后通常无需修改。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `ADMIN_USERNAME` | `admin` | 管理员登录用户名 |
| `PROXY_PUBLIC_LISTENER` | `false` | 新接入 VPS 的住宅代理公网监听默认值；面板中的单 VPS 设置优先 |

`PROXY_PUBLIC_LISTENER` 建议保持 `false`，确需公网访问时再通过面板的 **公网监听** 页面按 VPS 开启。

### 系统内置资源（无需填写）

以下配置由 `wrangler.jsonc` 管理，一键部署时自动创建或绑定。它们不是用户变量，请勿修改 binding 名称。

| 内置配置 | 类型 | 用途 |
| --- | --- | --- |
| `DB` | D1 Binding | 业务数据库 |
| `ASSETS` | Worker Assets Binding | 前端和 VPS 安装文件 |
| `VPS_PRESENCE` | Durable Object Binding | VPS 实时状态 |
| `DASHBOARD_HUB` | Durable Object Binding | 面板实时推送 |
| `*/5 * * * *` | Cron Trigger | 每 5 分钟执行离线检查 |

仓库已启用 `keep_vars: true`，更新同一个 Worker 时会保留 Dashboard 中未写入 `wrangler.jsonc` 的变量，Secrets 也不会被常规部署删除。

### 高级兼容配置

集成部署已内置实时服务和住宅代理控制器，正常使用时不要设置 `REALTIME_URL`、`PROXY_CTRL_URL`、`PROXY_CTRL_USER`、`PROXY_CTRL_PASS` 或 `PROXY_CTRL_TOKEN`。只有对接旧版分离服务或外部控制器时才需要这些变量。

旧版分离 Realtime 部署还必须在两端配置相同的 `REALTIME_AUTH_SECRET` Secret（至少 32 个随机字符），不得复用管理员密码。集成部署不需要设置。

Telegram 通知建议登录后在面板中设置。`TG_BOT_TOKEN`、`TG_CHAT_ID` 和 `TG_WEBHOOK_SECRET` 仅用于环境变量回退或 Webhook 加固；`CRON_SECRET` 仅在外部调用 `/api/cron_check` 时需要，内置 Cron 无需设置。

需要命令行部署、更新现有实例或排查资源绑定时，请参阅[部署与故障排查](docs/deployment.md)。

## VPS 接入

1. 登录 KUI，进入 **服务器与节点**。
2. 添加 VPS 名称和公网 IP。
3. 复制页面生成的 Full Deploy Command，以 `root` 在目标 VPS 执行。
4. 等待 Agent 回连后创建节点或执行批量部署。

卸载、备份和完整清理行为见 [VPS Agent 管理](docs/vps-agent.md)。

## 常见问题

- 页面空白、显示 `Hello World` 或出现 1101：检查 Worker Assets、`DB` 和 Durable Objects bindings。
- 点击登录后无响应：确认已部署最新 `main`，检查 `ADMIN_PASSWORD` 和 `DB`，重新部署后强制刷新浏览器。
- 住宅代理不可用：确认已配置代理凭据，并检查 VPS 上 `proxy-lite` 的状态与实时日志。

完整排查步骤见 [部署与故障排查](docs/deployment.md)。

## 文档

- [部署与故障排查](docs/deployment.md)
- [住宅代理与 Docker 接入](docs/residential-proxy.md)
- [VPS Agent 管理](docs/vps-agent.md)
- [安全配置](docs/security.md)
- [开发与验证](docs/development.md)

## 架构

```text
浏览器 / VPS Agent
        |
Cloudflare Worker
  |- Worker Assets: 前端与安装文件
  |- /api/*: KUI 后端接口
  |- WebSocket: 实时状态与面板推送
  |- Cron: 离线检查
  |- D1 (DB): 配置、用户、节点、流量和探针数据
  `- Durable Objects: VPS Presence 与 Dashboard Hub
```

## 开发验证

```bash
npm ci
npm run check
```

前端已使用 Vue 3 SFC + Vite，并按功能页面拆分在 `frontend/`。`npm run check` 会自动构建前端；更多说明见 [开发与验证](docs/development.md)。

## License

MIT
