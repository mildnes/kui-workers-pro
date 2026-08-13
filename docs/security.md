# 安全配置

## 用户需要配置的 Secrets

| Secret | 何时需要 | 安全要求 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 必需 | 项目没有默认管理员密码，请使用独立强密码 |
| `PROXY_USER` / `PROXY_PASS` | 使用住宅代理时 | 两项同时设置，不要与管理员凭据相同 |
| `TG_WEBHOOK_SECRET` | 启用 Telegram Webhook 加固时 | 使用随机值并妥善保存 |
| `REALTIME_AUTH_SECRET` | 仅旧版分离 Realtime 部署 | 至少 32 个随机字符，两端一致且不得复用管理员密码 |

一键部署后只需先设置 `ADMIN_PASSWORD`；其他项按功能需要添加。敏感信息必须在 Cloudflare 中选择 **Secret** 类型，不要提交密码、代理凭据、D1 ID、Telegram Token 或其他部署私密信息。

## 普通变量

- `ADMIN_USERNAME` 默认为 `admin`，仅在需要修改管理员用户名时调整。
- `PROXY_PUBLIC_LISTENER` 默认为 `false`，建议保持关闭；面板中的单 VPS 设置优先。
- Telegram、旧版实时服务和外部控制器的兼容变量仅在对应高级场景中设置，正常一键部署不需要。

## 网络暴露

- `PROXY_PUBLIC_LISTENER` 默认为 `false`。
- Docker 容器访问住宅代理时应使用指定网桥地址，不需要公网监听。
- 必须开放公网 SOCKS 时，应轮换凭据并通过防火墙限制来源。
- `39482` 是本机检查入口，不应暴露到公网。

## 系统内置资源

- `DB`、`ASSETS`、`VPS_PRESENCE` 和 `DASHBOARD_HUB` 是资源 bindings，不是用户变量。
- 一键部署会根据 `wrangler.jsonc` 自动处理这些资源，无需在 Variables 中重复填写。
- D1 binding 名称固定为 `DB`，Durable Objects 名称也不能随意修改。
- 使用已有 D1 时，确认绑定的是预期数据库。
- 不要删除 `VPS_PRESENCE` 和 `DASHBOARD_HUB` Durable Objects bindings。

## 会话与登录

- 浏览器认证会话存放在 `sessionStorage`，关闭会话后不会长期保留。
- 连续登录失败会触发速率限制；收到 `429` 后等待 15 分钟再试。
- 不要在命令历史、日志或截图中暴露密码和 Agent Token。
