<p align="center">
  <img src="docs/Logo.jpg" alt="Verko" width="120" height="120" />
</p>

<h1 align="center">Verko</h1>

<p align="center">
  <strong>Agent 原生的论文管理工具。</strong><br>
  论文以纯 Markdown 文件存储，AI 助手可直接读写、回答关于你论文库的任何问题。
</p>

<p align="center">
  <a href="https://github.com/CatVinci-Studio/Verko/releases/latest"><strong>下载</strong></a> ·
  <a href="https://catvinci-studio.github.io/Verko/"><strong>网页版</strong></a> ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/CatVinci-Studio/Verko/releases/latest"><img alt="version" src="https://img.shields.io/github/v/release/CatVinci-Studio/Verko"></a>
  <img alt="platform" src="https://img.shields.io/badge/平台-macOS%20%7C%20Windows%20%7C%20Linux%20%7C%20Web-lightgrey">
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/badge/协议-MIT-yellow"></a>
</p>

---

## 这是什么

一个用来组织学术论文的桌面应用（也有网页版）。你的论文库就是一个 CSV 加一个 Markdown 文件夹——没有私有数据库，没有平台锁定。你选用的 AI Agent 直接读写这些文件，和你看到的是同一份。

## 为什么用它

- **数据始终在你手里。** 一份 CSV，一堆 Markdown 笔记。Excel、VS Code 都能开，Git 做版本管理。
- **AI 帮你做杂活。** 用自然语言：*"总结我没读完的 NLP 论文"*、*"给扩散模型相关的打标签"*、*"导入这篇 arXiv 论文"*。Agent 直接读写你看到的同一批文件。
- **自带模型。** OpenAI、Claude、Gemini 任选——填入 API key 即可，随时切换。
- **网页也能用。** 网页版直接连接 S3 / R2 / B2——同一界面、同一 Agent。

## 安装

### 桌面

| 平台 | 下载 |
|---|---|
| macOS (Apple Silicon) | `Verko-X.Y.Z-arm64.dmg` |
| macOS (Intel) | `Verko-X.Y.Z.dmg` |
| Windows | `Verko-Setup-X.Y.Z.exe` |
| Linux | `Verko-X.Y.Z.AppImage` / `verko_X.Y.Z_amd64.deb` |

→ 最新版：[Releases](https://github.com/CatVinci-Studio/Verko/releases/latest)

### 网页

[catvinci-studio.github.io/Verko](https://catvinci-studio.github.io/Verko/) — 连接任意 S3 兼容存储桶（AWS S3、Cloudflare R2、Backblaze B2、MinIO）。需要给桶配好 CORS 允许该域。

## 快速上手

1. 启动 Verko → 选择 **打开已有文件夹** 或 **新建本地库**（网页版选 **连接 S3**）。
2. 打开 **设置 → Agent**，填入 OpenAI / Claude / Gemini 的 API key。
3. 按 **⌘K** 或点击侧栏 Agent —— 用自然语言问任何关于你论文库的问题。

## 文件结构

```
my-library/
  papers.csv                       ← 字段权威：title、authors、status、自定义列……
  papers/
    2017-vaswani-attention.md      ← 自由形式的笔记（纯 markdown）
  attachments/
    2017-vaswani-attention.pdf
  schema.md                        ← 列定义（你可以自己加）
  collections.json                 ← 合集成员
  skills/                          ← 可选：你自己写的 Agent 工作流模板
```

`papers.csv` 是所有字段的真值——用 Excel 改一列，应用启动时直接读到。每篇论文的 `.md` 只放笔记正文：

```markdown
## 核心思想

用自注意力替代循环结构……

## 我的备注

position encoding 那节多读两遍。
```

## Agent 能做什么

开箱即用：

- **搜索 / 总结** 整个论文库
- **添加 / 修改** 论文——直接改 CSV，或从 arXiv 导入
- **看 PDF 页** （配合 vision 模型——读图表、公式、表格）
- **管理合集 / 标签**
- **边读边记笔记**；输入框 `@` 提及论文可以把它钉在当前轮的上下文里

你可以用 **skills** 扩展 Agent ——在 `skills/` 里放一个带 `name` + `description` 的 markdown 文件。Agent 在系统提示里看到 description，需要时再加载完整 body。

对话很长时，输入框打 `/compact` 一键压缩；完整 transcript 会归档下来，前面的轮次被总结掉、后面继续不会爆 context。

所有文件操作都被限定在已注册的库目录内，Agent 触不到外面。

## 从源码构建

```bash
git clone https://github.com/CatVinci-Studio/Verko.git
cd Verko
npm install
npm run dev          # Electron 开发模式
npm run build:web    # 静态网页 → dist-web/
npm run dist:mac     # 或 :win / :linux
```

需要 Node 20+。代码结构：[CLAUDE.md](./CLAUDE.md)

## 许可证

[MIT](./LICENSE) © CatVinci Studio
