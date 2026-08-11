# 开发与验证

## 安装依赖

```bash
npm ci
```

## 本地运行

后端与 Worker Assets：

```bash
npm run build
npm run dev
```

本地运行前需要准备与生产环境一致的 D1、Durable Objects 和必要变量。

只开发前端界面时，可以启动 Vite：

```bash
npm run dev:ui
```

Vite 开发服务器只负责界面资源，`/api/*` 仍需要 Worker 环境。

## 前端结构

前端源码位于 `frontend/`：

- `src/app/`：桌面壳层、顶栏和移动导航。
- `src/pages/`：按页面拆分的 Vue SFC。
- `src/composables/`：共享状态、API、鉴权工具和探针数据。
- `src/proxy/`：住宅代理控制器兼容逻辑。
- `src/styles/`：设计令牌、统一布局和探针主题兼容样式。

`static/index.html` 与 `static/ui-assets/` 是生产构建产物，不应直接修改。住宅代理页面的固定 DOM ID 以及探针的主题兼容类属于外部集成契约，重构时必须保留。

## 前端构建

修改 `frontend/` 或 `src/tailwind.css` 后运行：

```bash
npm run build
```

该命令会先扫描所有 Vue/JavaScript 文件生成 Tailwind CSS，再由 Vite 输出到 `static/`。执行 `npm run deploy` 时会自动先构建前端。

## 完整检查

```bash
npm run check
```

该命令会执行：

- Vue SFC 与生产资源构建。
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
4. 部署后检查 `/health`、登录、桌面和手机导航、实时状态及 Agent 配置拉取。
