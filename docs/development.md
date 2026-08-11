# 开发与验证

## 安装依赖

```bash
npm ci
```

## 本地运行

```bash
npm run dev
```

本地运行前需要准备与生产环境一致的 D1、Durable Objects 和必要变量。

## 样式构建

修改 `static/index.html` 或 `src/tailwind.css` 中的 Tailwind 类名后运行：

```bash
npm run build:css
```

## 完整检查

```bash
npm run check
```

该命令会执行：

- Node 测试。
- Worker 和 Realtime JavaScript 语法检查。
- VPS Python 组件编译检查。
- Shell 脚本语法检查。
- Wrangler 部署 dry-run。

GitHub Actions 会在 `main`、`dev` 和 Pull Request 上执行相同检查。

## 发布前核对

1. 确认 `git diff --check` 无格式问题。
2. 运行 `npm run check`。
3. 确认没有提交 Secrets、D1 ID 或本地部署配置。
4. 部署后检查 `/health`、登录、实时状态和 Agent 配置拉取。
