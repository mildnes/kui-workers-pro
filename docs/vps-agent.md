# VPS Agent 管理

## 接入 VPS

1. 登录 KUI，进入 **服务器与节点**。
2. 添加 VPS 名称和公网 IP。
3. 复制页面生成的 Full Deploy Command。
4. 以 `root` 在目标 VPS 执行命令。
5. 等待 Agent 回连后创建节点或使用批量部署。

支持 XTLS-Reality、Hysteria2、TUIC、Shadowsocks 2022、Trojan、H2/gRPC-Reality、AnyTLS、Naive、VLESS-Argo、Socks5 和 Dokodemo-door。

## WARP Endpoint 优选

在 **WARP 隧道** 页面选择目标 VPS 后，可以检测 Cloudflare WireGuard Endpoint 的真实可用性、失败率和延迟。检测使用 VPS 上单独保存的测速身份，不会让当前业务 WARP 身份在候选之间漂移。

- 手动检测只生成推荐结果，点击 **应用推荐端点** 后才会切换。
- 应用时会验证实际 WARP 数据面；失败会恢复原 Endpoint 和 sing-box 配置。
- 默认策略为手动。可选择首次启用后检测一次，或连续两次失败后自动检测并恢复。
- 优选只改善 VPS 到 Cloudflare WARP 入口的质量，不保证改变出口国家或流媒体解锁能力。
- `warp.json`、测速身份和优化历史在完整更新 Agent 时会保留，文件权限为 `600`。

## 卸载与清理

每台 VPS 卡片提供两种清理命令。

### 仅卸载 Agent

- 停止并删除 `kui-agent`。
- 删除 KUI 安装的 `sing-box`、节点配置和证书。
- 保留 `proxy-lite`、OpenVPN 通道和面板记录。

### 卸载全部组件

- 删除 Agent、`sing-box`、`proxy-lite`、OpenVPN 通道和相关配置。
- 本机清理成功后，使用该 VPS 的 Agent Token 删除面板中的 VPS、节点、探针和住宅状态记录。

## 安全与恢复

- 清理前会创建 `/root/kui-agent-backup-时间戳.tar.gz`，权限为 `600`。
- 命令会核对目标 IP 与本机 Agent 记录，在错误 VPS 上执行时会拒绝卸载。
- 全量清理遵循“先清理 VPS、后删除面板记录”。如果 VPS 无法访问 Worker，面板记录会保留；修复网络或 DNS 后可重新执行同一条命令。
