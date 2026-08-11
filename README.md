# KUI x Server Monitor Pro

> 本项目 Fork 自 [a6216abcd/K-UI-workers](https://github.com/a6216abcd/K-UI-workers)，并在此基础上持续维护。

KUI 是部署在单一 Cloudflare Worker 上的代理节点管理与服务器探针面板。Worker Assets 托管前端和 VPS 安装组件，D1 保存业务数据，Durable Objects 提供实时 WebSocket，无需单独部署面板服务器或 Realtime Worker。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yuanlam/kui-workers-pro)

## 核心能力

- VPS、代理节点、多用户、订阅令牌、流量配额和到期管理。
- CPU、内存、磁盘、网络、连接数和线路延迟实时探针。
- XTLS-Reality、Hysteria2、TUIC、Shadowsocks 2022、Trojan、AnyTLS 等协议。
- 普通链接、Mihomo/Clash 和 Surge 配置导出。
- 原生、WARP、住宅代理和手动 SOCKS5 出口。
- 实时状态同步、公开探针、Telegram 告警和定时离线检查。

## 快速部署

1. 点击上方 **Deploy to Cloudflare Workers**。
2. 登录 Cloudflare，选择账户并确认 Worker 名称。
3. 确认部署流程创建了 `DB`、`VPS_PRESENCE` 和 `DASHBOARD_HUB` bindings。
4. 在 Worker 的 **Settings → Variables and Secrets** 中设置 `ADMIN_PASSWORD`。
5. 重新部署并使用用户名 `admin` 登录。

住宅代理还需要设置 `PROXY_USER` 和 `PROXY_PASS`。项目不内置任何默认密码。

| 配置 | 类型 | 必需 | 用途 |
| --- | --- | --- | --- |
| `DB` | D1 Binding | 是 | 业务数据库 |
| `VPS_PRESENCE` | Durable Object Binding | 是 | VPS 实时状态 |
| `DASHBOARD_HUB` | Durable Object Binding | 是 | 面板实时推送 |
| `ADMIN_PASSWORD` | Secret | 是 | 管理员登录密码 |
| `PROXY_USER` / `PROXY_PASS` | Secret | 住宅代理需要 | SOCKS5 认证凭据 |
| `ADMIN_USERNAME` | 普通变量 | 否 | 管理员用户名，默认 `admin` |
| `PROXY_PUBLIC_LISTENER` | 普通变量 | 否 | 允许公网监听住宅 SOCKS，默认 `false` |

密码和代理凭据必须在 Cloudflare 中选择 **Secret** 类型，不能写入仓库。非敏感配置使用普通变量，D1 与 Durable Objects 则在 **Bindings** 中配置。仓库已启用 `keep_vars: true`，部署到同一个 Worker 时会保留 Dashboard 中未写入 `wrangler.jsonc` 的普通变量；Secrets 本身也不会被常规部署删除。Deploy 按钮仅用于首次安装，后续应通过 Git 自动部署或 `wrangler deploy` 更新同一个 Worker。

实时服务已集成到主 Worker，不需要配置 `REALTIME_URL`、`PAGES_ORIGIN` 或单独的 Realtime Worker。

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

修改 Tailwind 类名后先运行 `npm run build:css`。更多说明见 [开发与验证](docs/development.md)。

## License

MIT
