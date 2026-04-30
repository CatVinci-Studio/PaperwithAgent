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

一个用来组织学术论文的桌面应用（也有只读的网页版）。你的论文库就是一个普通文件夹，一篇论文一个 Markdown 文件——没有私有数据库，没有平台锁定。你选用的 AI Agent 通过和界面同一份文件直接读写论文库。

## 为什么用它

- **数据始终在你手里。** 一篇论文 = 一个 Markdown。任何文本编辑器都能打开，用 Git 做版本管理。
- **AI 帮你做杂活。** 用自然语言：*"总结我没读完的 NLP 论文"*、*"给扩散模型相关的打标签"*、*"导入这个 DOI"*。Agent 有完整文件访问权。
- **自带模型。** OpenAI、Claude、Gemini 任选——填入 API key 即可，随时切换。
- **网页也能用。** 只读网页版直接连接 S3 / R2 / B2 ——同一界面、同一 Agent。

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
  papers/
    2017-vaswani-attention.md      ← YAML 元数据 + 笔记正文
  attachments/
    2017-vaswani-attention.pdf
  papers.csv                       ← 索引（自动重建，请勿手动编辑）
  schema.md                        ← 字段定义
  collections.json                 ← 集合成员关系
```

单篇论文：

```markdown
---
title: Attention Is All You Need
authors: ["Vaswani, A.", "Shazeer, N."]
year: 2017
status: read
tags: [transformers, nlp]
rating: 5
---

## 笔记

核心思想：用自注意力替代循环结构……
```

## Agent 能做什么

开箱即用：

- **搜索 / 总结** 论文库
- **添加 / 修改** 论文，可按 DOI 自动导入
- **看 PDF 页** （配合 vision 模型——读图表、公式、表格）
- **管理集合 / 标签**
- **边读边记笔记**

所有工具沙箱化到当前 library 根目录，Agent 无法访问外部文件。

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
