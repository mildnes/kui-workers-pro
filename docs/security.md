# 安全配置

## Secrets

- 必须设置 `ADMIN_PASSWORD`，项目没有默认管理员密码。
- 使用住宅代理时必须设置 `PROXY_USER` 和 `PROXY_PASS`。
- 管理员密码与代理密码应独立，并使用足够长度的随机值。
- 不要提交 `ADMIN_PASSWORD`、代理凭据、D1 ID、Telegram Token 或其他部署私密信息。

## 网络暴露

- `PROXY_PUBLIC_LISTENER` 默认为 `false`。
- Docker 容器访问住宅代理时应使用指定网桥地址，不需要公网监听。
- 必须开放公网 SOCKS 时，应轮换凭据并通过防火墙限制来源。
- `39482` 是本机检查入口，不应暴露到公网。

## Cloudflare 资源

- D1 binding 名称固定为 `DB`。
- 使用已有 D1 时，确认绑定的是预期数据库。
- 修改 Variables、Secrets 或 Bindings 后重新部署。
- 不要删除 `VPS_PRESENCE` 和 `DASHBOARD_HUB` Durable Objects bindings。

## 会话与登录

- 浏览器认证会话存放在 `sessionStorage`，关闭会话后不会长期保留。
- 连续登录失败会触发速率限制；收到 `429` 后等待 15 分钟再试。
- 不要在命令历史、日志或截图中暴露密码和 Agent Token。
