/**
 * PDF渲染工具 - 使用 Puppeteer 实现网页转PDF功能
 *
 * 命令行使用方式：
 * node neo.js --url <URL> --output <output.pdf> [--browser <path>] [--format <format>] [--landscape]
 * node neo.js --html <html-file> --output <output.pdf> [--browser <path>] [--format <format>] [--landscape]
 * node neo.js --file <html-file> --output <output.pdf> [--browser <path>] [--format <format>] [--landscape]
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');

// 从 config.json 同步的默认配置
const CONFIG_DEFAULTS = {
  browserPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  pdfOptions: {
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    displayHeaderFooter: false
  },
  renderOptions: {
    waitUntil: 'networkidle0',
    timeout: 180000,
    delay: 5000,
    waitForSelector: null,
    waitForImages: true,
    autoLandscape: true,
    viewport: { width: 2560, height: 1440, deviceScaleFactor: 2 },
    enableScrolling: true,
    scrollStep: 500,
    scrollDelay: 100,
    imageLoadTimeout: 10000,
    networkIdleTime: 3000
  }
};

class PdfRenderer {
  constructor(options = {}) {
    this.browserPath = options.browserPath || CONFIG_DEFAULTS.browserPath;

    this.defaultPdfOptions = {
      ...CONFIG_DEFAULTS.pdfOptions
    };

    this.defaultRenderOptions = {
      ...CONFIG_DEFAULTS.renderOptions
    };
  }

  async launchBrowser(headless = true) {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--headless=new',
      '--enable-javascript',
      '--enable-css-custom-properties',
      '--allow-running-insecure-content',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--window-size=2560,1440'
    ];

    return puppeteer.launch({
      executablePath: this.browserPath,
      args,
      headless: headless ? 'new' : false,
      ignoreHTTPSErrors: true
    });
  }

  async waitForPageLoad(page, renderOptions) {
    const options = { ...this.defaultRenderOptions, ...renderOptions };

    // 1. 模拟滚动页面，触发懒加载图片（改进版：多次滚动确保底部内容）
    if (options.enableScrolling !== false) {
      console.log('Scrolling page to trigger lazy loading...');
      await page.evaluate(async (scrollStep, scrollDelay, bottomWaitTime) => {
        // 多次滚动以确保所有内容加载
        for (let pass = 0; pass < 3; pass++) {
          const totalHeight = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.offsetHeight,
              window.innerHeight
          );

          // 逐步滚动
          for (let i = 0; i < totalHeight; i += scrollStep) {
            window.scrollTo(0, i);
            await new Promise(resolve => setTimeout(resolve, scrollDelay));
          }

          // 滚动到底部并等待更长时间
          window.scrollTo(0, totalHeight);
          await new Promise(resolve => setTimeout(resolve, bottomWaitTime));

          // 稍微回滚一点，确保底部内容完全进入视口
          window.scrollTo(0, totalHeight - window.innerHeight / 2);
          await new Promise(resolve => setTimeout(resolve, scrollDelay * 2));
        }

        // 最后一次滚动到底部，确保所有内容都被触发
        const finalHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );
        window.scrollTo(0, finalHeight);
        await new Promise(resolve => setTimeout(resolve, bottomWaitTime * 2));

        // 回到顶部准备生成PDF
        window.scrollTo(0, 0);
      }, options.scrollStep, options.scrollDelay, options.bottomWaitTime || 2000);
      console.log('Page scrolling completed');
    }

    // 2. 等待所有图片加载完成（改进版：带超时和统计）
    if (options.waitForImages) {
      console.log('Waiting for all images to load...');
      const imageStats = await page.evaluate(async (maxWaitTime) => {
        const images = Array.from(document.querySelectorAll('img'));
        const startTime = Date.now();

        await Promise.all(images.map(img => {
          return new Promise((resolve) => {
            // 检查图片是否已经加载完成
            if (img.complete && img.naturalWidth > 0) {
              return resolve();
            }

            // 设置加载超时
            const timeout = setTimeout(() => resolve(), maxWaitTime);

            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };

            img.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
          });
        }));

        // 检查是否有未加载的图片
        const loadedCount = images.filter(img => img.complete && img.naturalWidth > 0).length;
        const totalTime = Date.now() - startTime;

        return { total: images.length, loaded: loadedCount, time: totalTime };
      }, options.imageLoadTimeout || 10000);

      console.log(`Images: ${imageStats.loaded}/${imageStats.total} loaded in ${imageStats.time}ms`);

      if (imageStats.loaded < imageStats.total) {
        console.warn(`${imageStats.total - imageStats.loaded} images failed to load`);
      }
    }

    // 3. 等待字体加载
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
    });
    console.log('Fonts loaded');

    // 4. 等待网络空闲
    await page.waitForNetworkIdle({ idleTime: options.networkIdleTime || 3000, timeout: options.timeout });
    console.log('Network idle');

    // 5. 额外延迟
    if (options.delay > 0) {
      console.log(`Waiting ${options.delay}ms for dynamic content...`);
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
  }

  async setupPageStyles(page) {
    await page.emulateMediaType('screen');

    await page.addStyleTag({
      content: `
        @media screen, print {
          * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
          html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; }
        }
      `
    });
  }

  async renderFromUrl(url, outputPath, pdfOptions = {}, renderOptions = {}) {
    let browser = null;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();

      const options = { ...this.defaultRenderOptions, ...renderOptions };
      await page.setViewport(options.viewport);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

      await this.setupPageStyles(page);
      await page.goto(url, { waitUntil: options.waitUntil, timeout: options.timeout });
      await this.waitForPageLoad(page, renderOptions);
      await page.waitForNetworkIdle({ idleTime: 3000, timeout: options.timeout });
      await page.emulateMediaType('screen');

      const pageSize = await page.evaluate(() => ({
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
      }));

      let landscape = pdfOptions.landscape !== undefined ? pdfOptions.landscape : false;
      if (options.autoLandscape && pageSize.width > pageSize.height) landscape = true;

      const finalPdfOptions = {
        ...this.defaultPdfOptions,
        ...pdfOptions,
        path: outputPath,
        landscape,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };

      if (pageSize.width > 2000) {
        finalPdfOptions.format = undefined;
        finalPdfOptions.width = `${Math.min(pageSize.width, 4000)}px`;
        finalPdfOptions.height = `${pageSize.height}px`;
      }

      await page.pdf(finalPdfOptions);
      console.log(`PDF generated successfully: ${outputPath}`);
      return { success: true, path: outputPath };
    } catch (error) {
      console.error('Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async renderFromHtml(html, outputPath, pdfOptions = {}, renderOptions = {}) {
    let browser = null;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();

      const options = { ...this.defaultRenderOptions, ...renderOptions };
      await page.setViewport(options.viewport);
      await this.setupPageStyles(page);

      await page.setContent(html, { waitUntil: options.waitUntil, timeout: options.timeout });
      await this.waitForPageLoad(page, renderOptions);
      await page.emulateMediaType('screen');

      const finalPdfOptions = {
        ...this.defaultPdfOptions,
        ...pdfOptions,
        path: outputPath,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      };
      await page.pdf(finalPdfOptions);

      console.log(`PDF generated successfully: ${outputPath}`);
      return { success: true, path: outputPath };
    } catch (error) {
      console.error('Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      if (browser) await browser.close();
    }
  }

  async renderFromFile(filePath, outputPath, pdfOptions = {}, renderOptions = {}) {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const html = fs.readFileSync(filePath, 'utf-8');
    return this.renderFromHtml(html, outputPath, pdfOptions, renderOptions);
  }
}

/**
 * 使用 WHATWG URL API 验证 URL
 * @param {string} urlStr - 要验证的 URL 字符串
 * @returns {boolean|URL} - 无效返回 false，有效返回 URL 对象
 */
function validateUrl(urlStr) {
  try {
    // 使用 WHATWG URL API 创建 URL 对象
    const url = new URL(urlStr);

    // 验证协议必须是 http 或 https
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.error(`Invalid protocol: ${url.protocol}. Only http: and https: are supported.`);
      return false;
    }

    // 验证必须有主机名
    if (!url.hostname) {
      console.error('URL must have a hostname');
      return false;
    }

    return url;
  } catch (err) {
    console.error(`Invalid URL: ${err.message}`);
    return false;
  }
}

/**
 * 命令行参数解析
 */
function parseArgs(args) {
  const params = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        params.url = args[++i];
        break;
      case '--html':
        params.html = args[++i];
        break;
      case '--file':
        params.file = args[++i];
        break;
      case '--output':
      case '-o':
        params.output = args[++i];
        break;
      case '--browser':
        params.browser = args[++i];
        break;
      case '--format':
        params.format = args[++i];
        break;
      case '--landscape':
        params.landscape = true;
        break;
      case '--delay':
        params.delay = parseInt(args[++i]);
        break;
      case '--timeout':
        params.timeout = parseInt(args[++i]);
        break;
      case '--image-load-timeout':
        params.imageLoadTimeout = parseInt(args[++i]);
        break;
      case '--network-idle-time':
        params.networkIdleTime = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return params;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('PDF Renderer - Puppeteer based HTML to PDF converter');
  console.log('');
  console.log('Usage:');
  console.log('  node neo.js --url <URL> --output <output.pdf> [options]');
  console.log('  node neo.js --html <html-content> --output <output.pdf> [options]');
  console.log('  node neo.js --file <html-file> --output <output.pdf> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --url        URL to render (required for URL mode)');
  console.log('  --html       HTML content to render (required for HTML mode)');
  console.log('  --file       Path to HTML file (required for file mode)');
  console.log('  --output, -o Output PDF file path (required)');
  console.log('  --browser    Path to Chrome/Chromium executable');
  console.log('  --format     Paper format (A4, Letter, Legal, etc.)');
  console.log('  --landscape  Use landscape orientation');
  console.log('  --delay              Additional delay in milliseconds (default: 8000)');
  console.log('  --timeout            Timeout in milliseconds (default: 180000)');
  console.log('  --image-load-timeout Image load timeout in milliseconds (default: 10000)');
  console.log('  --network-idle-time  Network idle time in milliseconds (default: 3000)');
  console.log('  --help, -h           Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node neo.js --url https://example.com --output output.pdf');
  console.log('  node neo.js --file input.html --output output.pdf --format A4');
  console.log('  node neo.js --url https://github.com --output github.pdf --browser "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }

  const params = parseArgs(args);

  // 验证必需参数
  const errors = [];

  if (!params.output) errors.push('Missing --output parameter');

  const inputTypes = ['url', 'html', 'file'].filter(type => params[type]);
  if (inputTypes.length === 0) errors.push('Missing input source: --url, --html, or --file required');
  if (inputTypes.length > 1) errors.push('Only one input source allowed: --url, --html, or --file');

  // 使用 WHATWG URL API 验证 URL
  if (params.url) {
    const validatedUrl = validateUrl(params.url);
    if (!validatedUrl) {
      console.error(`Invalid URL: ${params.url}`);
      process.exit(1);
    }
    // 使用验证后的 URL 对象
    params.url = validatedUrl.href;
    console.log(`Validated URL: ${validatedUrl.hostname}`);
  }

  if (errors.length > 0) {
    console.error('Error:', errors.join('\n'));
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // 设置浏览器路径（使用 CONFIG_DEFAULTS 中的默认值）
  let browserPath = params.browser || CONFIG_DEFAULTS.browserPath;
  if (!browserPath || !fs.existsSync(browserPath)) {
    // 尝试自动检测浏览器路径
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    browserPath = possiblePaths.find(p => fs.existsSync(p));
    if (!browserPath) {
      console.error('Error: Chrome/Chromium not found. Please specify --browser path');
      process.exit(1);
    }
  }

  // 创建渲染器
  const renderer = new PdfRenderer({ browserPath });

  // 准备选项（使用 CONFIG_DEFAULTS 中的默认值）
  const pdfOptions = {
    ...CONFIG_DEFAULTS.pdfOptions,
    format: params.format || CONFIG_DEFAULTS.pdfOptions.format,
    landscape: params.landscape !== undefined ? params.landscape : CONFIG_DEFAULTS.pdfOptions.landscape
  };

  const renderOptions = {
    ...CONFIG_DEFAULTS.renderOptions,
    delay: params.delay !== undefined ? params.delay : CONFIG_DEFAULTS.renderOptions.delay,
    timeout: params.timeout !== undefined ? params.timeout : CONFIG_DEFAULTS.renderOptions.timeout,
    imageLoadTimeout: params.imageLoadTimeout !== undefined ? params.imageLoadTimeout : CONFIG_DEFAULTS.renderOptions.imageLoadTimeout,
    networkIdleTime: params.networkIdleTime !== undefined ? params.networkIdleTime : CONFIG_DEFAULTS.renderOptions.networkIdleTime
  };

  // 执行渲染
  let result;
  const outputPath = params.output;

  if (params.url) {
    result = await renderer.renderFromUrl(params.url, outputPath, pdfOptions, renderOptions);
  } else if (params.html) {
    result = await renderer.renderFromHtml(params.html, outputPath, pdfOptions, renderOptions);
  } else if (params.file) {
    result = await renderer.renderFromFile(params.file, outputPath, pdfOptions, renderOptions);
  }

  if (!result.success) {
    console.error('Failed:', result.error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}