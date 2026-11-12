# 薛冰的个人主页

> 一个静态的个人学习主页，展示学习笔记与每日黄历。部署于 GitHub Pages。

🔗 在线访问：<https://binggxue.github.io>

## 功能概览

- **个人主页（`index.html`）**：展示学习笔记列表、主页概览与每日黄历。
- **学习笔记**：通过 `notes.json` 维护 PDF 学习资料列表，点击即可在新窗口打开。
- **每日黄历**：展示农历、宜忌与节日节气，支持前后翻页。
- **主题切换**：支持浅色 / 暗黑 / 跟随系统三种模式，偏好存储于 `localStorage`。
- **响应式布局**：适配桌面与移动端。

## 目录结构

```
.
├── index.html              # 个人主页
├── data/
│   └── notes.json          # 学习笔记元数据
├── js/
│   ├── home.js             # 个人主页逻辑（笔记渲染、每日黄历）
│   ├── common.js           # 共享的日期与工具函数
│   └── theme.js            # 主题（浅色/暗黑/跟随系统）切换
├── css/
│   ├── base.css            # 公共样式
│   └── home.css            # 个人主页样式
├── img/                    # 图片资源（logo、主题图标）
├── notes/                  # 学习笔记 PDF（如 algebra.pdf、example.pdf）
├── favicon.svg             # 站点图标（SVG，优先使用）
└── img/logo.png            # 站点图标 PNG fallback
```

## 数据格式

### `data/notes.json`

```jsonc
{
  "notes": [
    {
      "id": "analysis",
      "title": "分析学",
      "type": "PDF",
      "category": "学习资料",
      "date": "2026-07-20",
      "summary": "数学分析、实分析、复分析、泛函分析、调和分析",
      "url": "notes/example.pdf",
    },
  ],
}
```

## 本地预览

本项目支持两种方式：传统静态服务器，或基于 Vite 的开发服务器（推荐，支持热更新与构建）。

### 方式一：Vite 开发服务器（推荐）

首次使用需安装依赖：

```bash
npm install
```

然后启动开发服务器：

```bash
npm run dev
```

在浏览器打开 Vite 提示的地址（默认 <http://localhost:5173>）。修改代码后页面会自动刷新。

### 方式二：静态服务器（无需安装）

```bash
# Python
python -m http.server 5173

# 或 Node
npx serve .
```

然后在浏览器打开 <http://localhost:5173>。

> 注意：笔记数据通过 `fetch` 异步加载，直接双击打开 HTML 文件（`file://`）可能因浏览器安全策略导致数据加载失败，建议使用上述本地服务器方式。

## 构建与部署

### 生产构建

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览构建产物
```

### 部署到 GitHub Pages

仓库配有两个 GitHub Actions 工作流（位于 `.github/workflows/`）：

- **CI**（`ci.yml`）：PR 或推送到 main 时自动运行 ESLint 与 Stylelint。
- **Deploy**（`deploy.yml`）：推送到 main 时自动 `npm run build` 并把 `dist/` 部署到 GitHub Pages。

使用 Actions 部署需要一次性设置：仓库 **Settings → Pages → Build and deployment → Source** 选择 **"GitHub Actions"**。

> 若不使用 Actions 部署，也可本地 `npm run build` 后将 `dist/` 内容推送到仓库。

## 维护指南

- **新增学习笔记**：把 PDF 放到 `notes/` 目录，在 `data/notes.json` 的 `notes` 数组中新增一项，`url` 指向对应文件（如 `notes/foo.pdf`）。

## 许可

个人学习用途，未声明开源许可证。
