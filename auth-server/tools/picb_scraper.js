/**
 * picb.cc 图片爬取脚本
 * 在 picb.cc/explore/popular 页面浏览器控制台粘贴运行
 *
 * 用法：
 *   1. 打开 https://picb.cc/explore/popular
 *   2. F12 打开控制台，粘贴本脚本全部代码
 *   3. 等待脚本自动滚动加载并提取
 *   4. 最终会 console.log 输出 JSON 数组，直接复制即可
 */

(async () => {
  'use strict';

  const SCROLL_DELAY = 800;        // 每次滚动间隔 ms
  const MAX_SCROLLS = 60;          // 最大滚动次数
  const SCROLL_STEP = 600;         // 每次滚动像素

  // ── 日志输出 ────────────────────────────────────────
  function log(msg, color = '#333') {
    console.log(`%c[picb_scraper] %c${msg}`, 'font-weight:bold;color:#e67e22', `color:${color}`);
  }

  // ── 辅助：从缩略图/中等图 URL 提取原图 URL ─────────
  // Chevereto URL 规律: xxx.th.jpg / xxx.md.jpg → xxx.jpg
  function toOriginalUrl(url) {
    if (!url) return '';
    // 去掉查询参数
    let u = url.split('?')[0];
    // 去掉 .th 或 .md 后缀
    return u.replace(/\.(th|md)\.(jpg|jpeg|png|gif|webp)$/i, '.$2');
  }

  // ── 提取当前页面所有可见图片 ──────────────────────
  function extractImages() {
    const images = [];
    const seen = new Set();

    // picb.cc 的图片通常在 <a> 标签中，包含 data-src 或 img[src]
    // 选择器覆盖多种可能的结构
    const selectors = [
      'a[data-src]',
      'img[data-src]',
      'a img[src]',
      'img[src]',
      '[data-src]',
      'figure img[src]',
      '.list-item-image img[src]',
      'a[href*="/image/"] img',
      '.pad-content-listing img[src]',
      '[class*="image"] img[src]',
      '[class*="photo"] img[src]',
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    log(`当前页面匹配到 ${elements.length} 个元素`);

    elements.forEach(el => {
      // 获取图片 URL
      let src = el.dataset?.src || el.getAttribute('data-src') || el.src || '';
      if (el.tagName === 'A' && !src) {
        const img = el.querySelector('img');
        if (img) src = img.dataset?.src || img.getAttribute('data-src') || img.src || '';
      }
      if (!src || (!src.startsWith('http') && !src.startsWith('//'))) return;
      if (src.startsWith('//')) src = 'https:' + src;

      // 转为原图链接用于去重
      const origUrl = toOriginalUrl(src);
      if (!origUrl || seen.has(origUrl)) return;
      seen.add(origUrl);

      // 获取缩略图链接
      const thumbUrl = src;

      // 获取尺寸 - 从 data- 属性或 img 自然尺寸
      let width = 0, height = 0;
      const dataW = el.dataset?.width || el.getAttribute('data-width');
      const dataH = el.dataset?.height || el.getAttribute('data-height');
      if (dataW && dataH) {
        width = parseInt(dataW);
        height = parseInt(dataH);
      }
      if ((!width || !height) && el.tagName === 'IMG') {
        width = el.naturalWidth || 0;
        height = el.naturalHeight || 0;
      }
      if ((!width || !height) && el.tagName === 'A') {
        const img = el.querySelector('img');
        if (img) {
          width = img.naturalWidth || 0;
          height = img.naturalHeight || 0;
        }
      }

      // 获取标题 - alt / title / 父级文本
      let title = '';
      if (el.tagName === 'IMG') {
        title = el.alt || el.title || '';
      }
      if (!title && el.tagName === 'A') {
        const img = el.querySelector('img');
        if (img) title = img.alt || img.title || '';
      }
      if (!title) {
        title = el.getAttribute('aria-label') || el.title || '';
      }
      if (!title) {
        // 尝试从链接文本获取
        const text = el.textContent?.trim();
        if (text && text.length < 100) title = text;
      }
      if (!title) {
        // 从 URL 提取文件名
        const match = origUrl.match(/\/([^/?#]+)\.\w+$/);
        if (match) title = decodeURIComponent(match[1]).replace(/[-_]/g, ' ');
      }

      images.push({
        title: title || 'untitled',
        hd_path: origUrl,
        thumbnail_path: thumbUrl,
        width,
        height,
        category_id: 141, // 默认分类，用户可自行修改
      });
    });

    return images;
  }

  // ── 滚动加载更多 ────────────────────────────────────
  async function scrollToLoad() {
    log('开始滚动加载图片...', '#2ecc71');
    let prevCount = 0;
    let noNewCount = 0;

    for (let i = 0; i < MAX_SCROLLS; i++) {
      window.scrollBy(0, SCROLL_STEP);
      await new Promise(r => setTimeout(r, SCROLL_DELAY));

      const currentImages = extractImages();
      const currentCount = currentImages.length;

      log(`第 ${i + 1} 次滚动: 已收集 ${currentCount} 张图片`, '#3498db');

      if (currentCount === prevCount) {
        noNewCount++;
        if (noNewCount >= 5) {
          log('连续 5 次未发现新图片，停止滚动', '#e67e22');
          break;
        }
      } else {
        noNewCount = 0;
      }
      prevCount = currentCount;
    }
  }

  // ── 主流程 ──────────────────────────────────────────
  log('===== picb.cc 爬虫启动 =====', '#8e44ad');

  // 先提取当前可见图片
  let images = extractImages();

  // 滚动加载更多
  await scrollToLoad();

  // 最终提取所有图片并去重
  images = extractImages();
  log(`共计提取 ${images.length} 张图片`, '#2ecc71');

  // ── 输出结果 ────────────────────────────────────────
  const json = JSON.stringify(images, null, 2);
  console.log('%c========== 爬取结果（复制以下 JSON）==========', 'font-weight:bold;font-size:14px;color:#e74c3c');
  console.log(json);
  console.log('%c==============================================', 'font-weight:bold;font-size:14px;color:#e74c3c');
  console.log(`%c共 ${images.length} 张图片，复制上方 JSON 到导入页面即可`, 'font-size:14px;color:#2ecc71');
  console.log('%c导入页面地址: /import.html', 'font-size:14px;color:#3498db');

  // 如果支持，自动复制到剪贴板
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(json);
      log('已自动复制到剪贴板！', '#27ae60');
    } catch {
      log('自动复制失败，请手动复制上方 JSON', '#e67e22');
    }
  } else {
    log('当前环境不支持自动复制，请手动复制上方 JSON', '#e67e22');
  }

})();
