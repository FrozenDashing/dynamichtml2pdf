# 🚀 PDF Renderer – HTML/URL to PDF with Puppeteer

[![Node Version](https://img.shields.io/badge/node-%3E%3D14-green.svg)](https://nodejs.org/)
[![Puppeteer](https://img.shields.io/badge/puppeteer--core-%5E21.0-blue)](https://pptr.dev/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

> **Convert any webpage or HTML file to a high-quality PDF** – with lazy loading, image waiting, auto‑landscape, and full Puppeteer power.

---

## 📖 English

### ✨ Features

- 🌐 **Render from** URL, raw HTML string, or local HTML file
- 🖼️ **Smart lazy loading** – scrolls the page multiple times to trigger all images and dynamic content
- ⏳ **Wait for everything** – images, web fonts, network idle state
- 🔄 **Auto‑landscape detection** – automatically switches to landscape if the page is wider than tall
- 📏 **High‑DPI viewport** (2560×1440, 2x scale) for sharp rendering
- ⚙️ **Fully configurable** – paper format, margins, timeouts, scrolling behavior, etc.
- 🖥️ **Cross‑platform** – works with Chrome/Chromium on Windows, macOS, Linux

### 🛠️ Tech Stack

- **Node.js** (≥14)
- **puppeteer-core** – Headless Chrome automation
- Built‑in modules: `fs`, `url`

### 📦 Installation

```bash
npm install puppeteer-core
```

> ⚠️ You also need **Google Chrome** or **Chromium** installed on your system.  
> The tool will try to find it automatically; otherwise use `--browser <path>`.

### 🖥️ Command Line Usage

```bash
node neo.js --url <URL> --output <output.pdf> [options]
node neo.js --html "<html>..." --output <output.pdf> [options]
node neo.js --file <input.html> --output <output.pdf> [options]
```

#### Required arguments

| Argument | Description |
|----------|-------------|
| `--url`, `--html`, or `--file` | Source of the content (only one allowed) |
| `--output`, `-o` | Output PDF file path |

#### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--browser` | auto‑detected | Path to Chrome/Chromium executable |
| `--format` | `A4` | Paper format: `A4`, `Letter`, `Legal`, etc. |
| `--landscape` | `false` | Force landscape orientation |
| `--delay` | `5000` | Extra delay (ms) after page loads |
| `--timeout` | `180000` | Navigation timeout (ms) |
| `--image-load-timeout` | `10000` | Max wait for each image (ms) |
| `--network-idle-time` | `3000` | Network idle time threshold (ms) |
| `--help`, `-h` | – | Show help |

#### Examples

```bash
# Basic URL to PDF
node neo.js --url https://example.com --output example.pdf

# Local HTML file, landscape A3
node neo.js --file report.html --output report.pdf --format A3 --landscape

# Custom Chrome path and longer delay
node neo.js --url https://github.com --output github.pdf \
  --browser "C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --delay 8000
```

### ⚙️ Advanced Configuration

The script includes many built‑in optimizations:

- **Scrolling passes** – scrolls 3 times from top to bottom, then back to top (ensures all lazy‑loaded content is rendered)
- **Image tracking** – waits for each `<img>` to complete; reports load statistics
- **Font loading** – waits for `document.fonts.ready`
- **Network idle** – uses `waitForNetworkIdle` with configurable idle time
- **Auto‑landscape** – overrides `--landscape` when page width > height and `autoLandscape` is true (default)

You can edit the `CONFIG_DEFAULTS` object inside the script to change defaults (viewport size, scroll step, etc.).

---

## 📖 中文文档

### ✨ 功能特点

- 🌐 **支持三种输入**：网页 URL、HTML 字符串、本地 HTML 文件
- 🖼️ **智能懒加载**：多次滚动页面，触发所有图片和动态内容
- ⏳ **完整等待机制**：等待图片、字体、网络空闲
- 🔄 **自动横屏检测**：当页面宽度大于高度时自动切换为横向
- 📏 **高 DPI 视口**：2560×1440，2 倍缩放，输出清晰锐利
- ⚙️ **丰富配置项**：纸张格式、边距、超时、滚动行为等均可调整
- 🖥️ **跨平台支持**：Windows / macOS / Linux

### 🛠️ 技术栈

- **Node.js**（版本 ≥14）
- **puppeteer-core** – 无头 Chrome 自动化
- 内置模块：`fs`、`url`

### 📦 安装

```bash
npm install puppeteer-core
```

> ⚠️ 系统需要已安装 **Google Chrome** 或 **Chromium**。脚本会自动查找常见路径，也可以使用 `--browser` 手动指定。

### 🖥️ 命令行用法

```bash
node neo.js --url <URL> --output <output.pdf> [选项]
node neo.js --html "<html>..." --output <output.pdf> [选项]
node neo.js --file <输入.html> --output <output.pdf> [选项]
```

#### 必需参数

| 参数 | 说明 |
|------|------|
| `--url` 或 `--html` 或 `--file` | 内容来源（三选一） |
| `--output`, `-o` | 输出的 PDF 文件路径 |

#### 选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--browser` | 自动检测 | Chrome/Chromium 可执行文件路径 |
| `--format` | `A4` | 纸张格式：`A4`、`Letter`、`Legal` 等 |
| `--landscape` | `false` | 强制横向布局 |
| `--delay` | `5000` | 页面加载完成后额外等待（毫秒） |
| `--timeout` | `180000` | 导航超时时间（毫秒） |
| `--image-load-timeout` | `10000` | 每个图片的最大等待时间（毫秒） |
| `--network-idle-time` | `3000` | 网络空闲判定时间（毫秒） |
| `--help`, `-h` | – | 显示帮助信息 |

#### 示例

```bash
# 将网页转为 PDF
node neo.js --url https://example.com --output example.pdf

# 本地 HTML 文件，横向 A3
node neo.js --file report.html --output report.pdf --format A3 --landscape

# 自定义 Chrome 路径并增加延迟
node neo.js --url https://github.com --output github.pdf \
  --browser "C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --delay 8000
```

### ⚙️ 高级配置

脚本内置了多项渲染优化：

- **多次滚动**：从上到下滚动 3 次，最后回到顶部（确保所有懒加载内容都已触发）
- **图片追踪**：等待每个 `<img>` 加载完成，并输出统计信息（成功/总数）
- **字体加载**：等待 `document.fonts.ready`
- **网络空闲**：使用 `waitForNetworkIdle`，可配置空闲阈值
- **自动横屏**：当 `autoLandscape` 为 `true`（默认）且页面宽度大于高度时，自动使用横向

你可以直接修改脚本中的 `CONFIG_DEFAULTS` 对象来调整默认值（如视口尺寸、滚动步长等）。

### ⚠️ 注意事项

- 生成的 PDF 默认**无边距**（`margin: 0`），且会强制重置页面所有元素的 `margin` 和 `padding`（仅用于 PDF 渲染，不影响原始网页显示）。
- 如果页面包含复杂的 WebGL 或 Canvas 动画，建议增加 `--delay` 等待动画完成。
- 对于超大宽度（>2000px）的页面，脚本会自动改用 `width`/`height`（px）而非标准纸张格式，以保证内容不被截断。


## 🤝 Contributing / 贡献

Issues and pull requests are welcome!  
欢迎提交 Issue 和 Pull Request。

<br>
<br>
<br>
<br>
<br>

<p align="right">Enjoy turning the web into beautiful PDFs!** 📄✨ </p>
<p align="right">享受将网页转为精美 PDF 的乐趣！</p>
