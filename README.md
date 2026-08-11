# KUI x Server Monitor Pro

> 本项目是从 [a6216abcd/K-UI-workers](https://github.com/a6216abcd/K-UI-workers) Fork 后持续修改维护的版本。

## 项目赞助商

<p align="center">
  <a href="https://derouter.ai?ref=0oZZ1HVc" target="_blank">
    <strong>DeRouter</strong> - 基于区块链的透明大模型 API 网关
  </a>
</p>

DeRouter 提供 Claude、GPT 等模型 API 服务，支持透明可验证的模型调用。

- 官网：https://derouter.ai?ref=0oZZ1HVc
- X：https://x.com/derouter_net
- 有 API 需求或 Claude 账号托管需求可访问其官网了解详情。

<p align="center">
  <a href="https://bytevirt.com/aff.php?aff=209" target="_blank">
    <strong>ByteVirt</strong> - 高性价比云服务器与 VPS 服务商
  </a>
</p>

ByteVirt 提供多地域 VPS，适合部署 KUI VPS Agent、探针与代理节点。

- 官网：https://bytevirt.com/aff.php?aff=209
- 多地域机房与稳定网络，适用于 KUI 节点部署。

---

> **⚠️ 重要提示：一键部署后如果页面显示空白或 "Hello World"，请阅读下方 [一键部署故障排除](#一键部署故障排除)。**

KUI 是一个部署在 **单一 Cloudflare Worker** 的代理节点管理与服务器探针面板。Worker Assets 托管前端和 VPS 安装组件，D1 保存配置、用户、流量和探针数据，Durable Objects 提供实时 WebSocket；无需部署传统面板服务器或额外 Realtime Worker。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yuanlam/kui-workers-pro)

## 一键部署

1. 点击上方 **Deploy to Cloudflare Workers**。
2. 登录 Cloudflare，选择账户并确认 Worker 名称。
3. Cloudflare 会自动创建并绑定 D1 数据库到 `DB`，同时创建实时状态需要的 Durable Objects。不要删除这些 bindings。
4. **首次访问：** 部署成功后直接打开 Worker 地址即可登录。
   - 如果页面正常显示登录界面，说明部署成功。
   - **如果页面显示空白、"Hello World" 或 1101 错误，请参照下方故障排除。**

### 一键部署故障排除

如果部署后页面无法正常加载，请按以下步骤排查：

**① 检查 D1 数据库绑定**
- 进入 Cloudflare Dashboard → Workers & Pages → 你的 Worker (kui)
- 左侧 → **Settings → Variables**
- 在 **D1 Database Bindings** 下找到 `DB`
- 如果没有绑定，点击 **Add binding**：
  - Variable name: `DB`
  - D1 database: 选择或创建一个 D1 数据库
- 绑定后点击 **Deploy** 重新部署

**② 检查 Durable Objects 绑定**
- 同一页面，在 **Durable Object Bindings** 下方应有以下两项：
  - `VPS_PRESENCE` → VpsPresence
  - `DASHBOARD_HUB` → DashboardHub
- 如果缺失，手动添加并重新部署

**③ 检查兼容性标志**
- 在 **Compatibility flags** 中添加：`assets_navigation_prefer_worker`
- 重新部署

**④ 如果仍然显示 Hello World**
- 在 Workers & Pages 页面找到你的 Worker
- 点击进入 → 点击右上角 **Quick Edit**
- 确认编辑器中的代码与实际仓库代码一致
- 如不一致，手动将 `src/worker.js` 内容复制进去，保存并重新部署

部署后先在 Worker 的 **Settings → Variables and Secrets** 配置管理员密码：

```text
ADMIN_PASSWORD=使用独立强密码
```

管理员用户名默认为 `admin`。项目不再内置默认密码；未配置 `ADMIN_PASSWORD` 时登录接口会返回配置错误。

启用内置住宅代理前还必须配置独立凭据：

```text
PROXY_USER=使用独立用户名
PROXY_PASS=使用独立强密码
```

缺少这两项时住宅代理接口不会下发凭据。

住宅 SOCKS 服务默认只监听 VPS 本机 `127.0.0.1`，供 KUI Agent 链式出口使用。如果确实需要从公网直连住宅 SOCKS，可显式设置：

```text
PROXY_PUBLIC_LISTENER=true
```

开放公网监听前请先轮换代理凭据并限制防火墙来源；面板会持续显示安全告警。

如果 VPS 上的 Docker 容器需要使用住宅出口，不必开放公网监听。在“住宅 IP 代理”页面的 **Docker 网桥** 输入该 VPS 网桥地址（通常是 `172.17.0.1`）并下发策略。该地址会同时用于 `proxy-lite` 的 `7920` 和 Agent sing-box 的 `39482`，只绑定指定网桥地址。

Compose 服务还需要加入宿主机别名，并使用宿主机网关地址访问代理：

```yaml
services:
  your-service:
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

容器内代理地址使用 `socks5h://kui:代理密码@host.docker.internal:7920`；`39482` 为本机无认证检查入口。留空 Docker 网桥字段即可恢复仅 `127.0.0.1` 监听。

## 自定义域名

在 Worker 的 **Settings → Domains & Routes → Add** 中绑定域名或子域名。绑定后直接使用该域名访问面板。

## 手动部署（CLI）

适用于不想让 Cloudflare 创建 GitHub 副本、需要固定 Worker 名称，或希望自行维护 D1/发布流程的场景。手动部署只会使用当前本地工作区，不会修改本仓库。

### 1. 准备代码和 Cloudflare 登录

```bash
git clone https://github.com/yuanlam/kui-workers-pro.git
cd kui-workers-pro
npm ci
npx wrangler login
```

### 2. 创建并绑定 D1

每个独立部署需要自己的 D1 数据库。先创建数据库：

```bash
npx wrangler d1 create kui-worker-db
```

将命令输出的 `database_id` 填入本地 `wrangler.jsonc`，不要提交到公开仓库：

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "kui-worker-db",
    "database_id": "替换为你的 database_id"
  }
]
```

项目会在首次请求时自动创建表结构，不需要额外执行 SQL migration。`DB` 是固定 binding 名称，不能改成其他名称。

### 3. 设置 Worker 名称和密钥

可以直接修改 `wrangler.jsonc` 中的 `name`，或部署时传入名称：

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put PROXY_USER
npx wrangler secret put PROXY_PASS
```

三个命令会交互式读取 Secret。请为管理员和住宅代理分别使用独立强凭据。

### 4. 部署并验证

```bash
npx wrangler deploy --name my-kui-worker
```

部署完成后打开 Cloudflare 输出的 Worker 地址，使用你设置的管理员密码登录。也可以检查：

```bash
curl -fsS https://你的-worker-域名/health
```

手动部署不会自动创建 GitHub 仓库；后续更新时在本地执行 `git pull` 后再次运行 `npx wrangler deploy` 即可。

### 一键部署与手动部署的区别

| 方式 | 代码来源 | Cloudflare 资源 | 是否可能创建 GitHub 副本 |
| --- | --- | --- | --- |
| 一键部署 | 公开 GitHub 仓库 | 部署者自己的 Worker、D1、Durable Objects | 取决于部署向导是否启用 GitHub 集成 |
| 手动部署 | 当前本地目录 | 部署者明确指定的资源 | 不会 |

当前 `wrangler.jsonc` 未指定 D1 ID，首次部署会自动创建数据库和实时 Durable Objects。若需要使用已有 D1，在 Cloudflare Dashboard 的 Worker **Settings → Bindings** 中将 `DB` 重绑到目标数据库后重新部署。

部署前必须设置管理员密码：

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```

本地预览：

```bash
npm run dev
```

## 已内置实时服务

实时 WebSocket、Agent 在线状态、即时配置刷新、公开探针实时更新和观众频率自适应均已内置于主 Worker。

部署后无需配置：

- `REALTIME_URL`
- `PAGES_ORIGIN`
- 单独的 Realtime Worker
- 单独的 Realtime D1 或 Durable Objects

## VPS 接入

1. 登录 KUI，进入 **服务器与节点**。
2. 添加 VPS 名称和公网 IP。
3. 复制页面生成的 Full Deploy Command，以 `root` 在 VPS 执行。
4. 等待 Agent 回连后创建节点或使用“9 合 1”批量部署。

每台 VPS 卡片提供两种清理入口。在对应 VPS 的 `root` 终端执行生成的命令后，将：

- 先在 `/root/kui-agent-backup-时间戳.tar.gz` 创建权限为 `600` 的恢复备份。
- 核对命令中的目标 IP 与本机 Agent 记录；粘贴到错误 VPS 时会拒绝卸载。
- “仅卸载 Agent（保留住宅代理）”：停止并删除 `kui-agent`、KUI 安装的 `sing-box`、节点配置及证书，但保留 `proxy-lite`、OpenVPN 通道和面板记录。
- “卸载全部组件并移除面板记录”：额外删除 `proxy-lite`、OpenVPN 通道及相关配置；本机清理成功后，命令会使用该 VPS 的 Agent Token 自动删除面板中的 VPS、节点、探针和住宅状态记录。

全量清理命令采用“先清理 VPS、后删除面板记录”的顺序；如果 VPS 无法访问 Worker，面板记录会保留，修复网络/DNS 后可重新执行同一条命令。

支持 XTLS-Reality、Hysteria2、TUIC、Shadowsocks 2022、Trojan、H2/gRPC-Reality、AnyTLS、Naive、VLESS-Argo、Socks5 与 Dokodemo-door。

## 主要能力

- 多用户、订阅令牌、流量配额和到期管理。
- 普通链接与 Mihomo/Clash 订阅导出，包括 Shadowsocks 2022 与 AnyTLS。
- Surge `[Proxy]` 配置段直接复制；自动跳过 Surge 不原生支持的协议并附加注释。
- CPU、内存、磁盘、网络、TCP/UDP 与线路延迟探针。
- 多种预设探针主题、自定义 CSS 和背景。
- 原生、WARP、住宅代理和手动 SOCKS5 节点出口。
- 可选 Telegram 告警与订阅保护。
- Worker Cron 每 5 分钟检查离线节点。

## 架构

```text
浏览器 / VPS Agent
        |
Cloudflare Worker
  |- Worker Assets: 前端与 VPS 安装文件
  |- /api/*: KUI 后端接口
  |- /agent/ws、/dashboard/*、/public/ws：内置实时服务
  |- Cron: 离线检查
  |- D1 (DB): 配置、用户、节点、流量、探针数据
  `- Durable Objects: VPS 实时状态与 Dashboard Hub
```

## 注意事项

- 项目不内置管理员密码或住宅代理凭据；部署后必须将 `ADMIN_PASSWORD`、`PROXY_USER`、`PROXY_PASS` 配置为 Secret。
- `PROXY_PUBLIC_LISTENER` 默认为 `false`；除非确实需要外部直连住宅 SOCKS，否则不要开启。
- 不要提交自定义 `ADMIN_PASSWORD`、D1 ID、Telegram Token 或代理凭据。
- `DB` 是固定 binding 名称，修改会导致后端无法访问数据库。
- 修改 Worker Variables 或 Bindings 后需要重新部署。
- 使用已有 D1 时，确认 `DB` 绑定指向正确数据库。
- `workspace-preview.html` 仅用于本地预览，不参与 Worker 静态资源发布。

## 开发验证

修改 `static/index.html` 或 `src/tailwind.css` 中的 Tailwind 类名后，先重新生成静态样式：

```bash
npm run build:css
```

```bash
npm ci
npm run check
```

GitHub Actions 会在 `main`、`dev` 和 Pull Request 上执行同一套测试、语法检查及 Wrangler dry-run。

## 开源协议

MIT
