# 软件发布页面

这是一个面向 Cloudflare Pages 的静态发布页面，展示“开发版”和“正式版”两个部分的软件发布信息。

## 功能

- 自动读取 GitHub Release 数据
- 展示程序名称、简介、版本号、更新日期、更新日志
- 支持 macOS / Windows 下载按钮
- 可部署到 Cloudflare Pages 或任意静态站点托管服务

## 文件说明

- `index.html`：主页面入口
- `styles.css`：页面样式
- `app.js`：GitHub Release 数据获取和渲染逻辑
- `package.json`：本地预览脚本和依赖管理

## 当前支持仓库

- 开发版
  - `timcode-cmyk/pyMediaConvert` → `MediaTools`
  - `timcode-cmyk/AssetsManager` → `AssetsManager`

- 正式版
  - `secure-artifacts/pyMediaTools` → `MediaTools`
  - `secure-artifacts/AssetsManager` → `AssetsManager`

## 本地预览

推荐使用以下命令启动本地服务：

```bash
npm install
npm run start
```

然后访问 `http://localhost:3000`（或 `serve` 输出的地址）。

如果你不想安装依赖，也可以使用 Python 直接预览：

```bash
cd /Volumes/Ark/shell/ApplicationPage
python3 -m http.server 8080
```

## 部署到 Cloudflare Pages

1. 将此仓库作为 Cloudflare Pages 项目仓库。
2. 选择 `Production branch`，通常为 `main`。
3. 构建设置：
   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. 保存并发布。

> 本页面使用 Vue + Vite 构建，最终输出为静态文件，可直接部署到 Cloudflare Pages。

## 标准 Cloudflare Pages 项目说明

- 该仓库是一个 Vue + Vite 项目，入口文件为 `index.html`，源代码位于 `src/`。
- `npm run dev` 启动本地开发服务器；`npm run build` 生成生产代码到 `dist/`。
- 若使用 Cloudflare Pages Git 集成，请确保构建命令为 `npm run build`，输出目录为 `dist`。

## 注意事项

- GitHub API 存在速率限制。如果访问量较大，建议使用 GitHub PAT 或在构建时生成静态数据。
- 若某个仓库没有上传 macOS/Windows 资产，页面会显示“暂无”。
- 资产匹配依据文件名后缀和关键字，如 `.dmg`、`.pkg`、`.exe`、`.msi`。
