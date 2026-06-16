// preview-page.js - 图片预览轮播页面逻辑

// Toast 提示（替代 alert）
(function() {
  var style = document.createElement('style');
  style.textContent = '.toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;pointer-events:none;opacity:0;transition:opacity .3s}.toast.show{opacity:1}';
  document.head.appendChild(style);
})();
function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('show'); });
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 2000);
}

const API = '/api';
const token = localStorage.getItem('token');

const params = new URLSearchParams(window.location.search);
const imageId = params.get('id');
const groupId = params.get('group_id');

let images = [];
let currentIndex = 0;
let currentImage = null;
let anchorId = null;  // group 模式下锚点图片 ID（组内最小 ID），点赞/评论绑定到此 ID
let touchStartX = 0;
let touchEndX = 0;

function getGroupAnchorId() {
  if (!groupId || images.length === 0) return null;
  return images.reduce((min, img) => img.id < min ? img.id : min, images[0].id);
}

async function loadImages() {
  try {
    if (groupId) {
      const res = await fetch(API + `/images?group_id=${groupId}`);
      images = await res.json();
    } else {
      const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
      const res = await fetch(API + `/images/${imageId}`, { headers });
      const img = await res.json();
      if (img.error) { showToast(img.error); return; }
      images = [img];
    }

    if (images.length === 0) { showToast('图片不存在'); return; }

    // 找到初始图片索引
    if (imageId) {
      const idx = images.findIndex(i => i.id == imageId);
      if (idx >= 0) currentIndex = idx;
    }

    currentImage = images[currentIndex];
    anchorId = getGroupAnchorId();
    renderCarousel();
    // group 模式用锚点 ID 加载，非 group 模式用当前图片 ID
    loadDetail(anchorId || currentImage.id);
  } catch (e) {
    showToast('加载失败');
  }
}

function renderCarousel() {
  const inner = document.getElementById('carouselInner');
  const dots = document.getElementById('carouselDots');

  inner.innerHTML = images.map(img => {
    const src = getSafeImageSrc(img);
    return `<div class="carousel-slide"><img src="${src}" alt="${img.title}" onerror="setImgFallback(this)"></div>`;
  }).join('');

  dots.innerHTML = images.map((img, i) => {
    const src = getThumbSrc(img);
    return `<img class="carousel-thumb${i === currentIndex ? ' active' : ''}" src="${src}" alt="" onclick="goTo(${i})" onerror="this.style.display='none'">`;
  }).join('');

  updatePosition();
  updateCounter();

  // 左右按钮显隐
  document.getElementById('btnPrev').style.display = images.length > 1 ? 'flex' : 'none';
  document.getElementById('btnNext').style.display = images.length > 1 ? 'flex' : 'none';
}

function localPath(path) {
  return /^https?:\/\//.test(path) ? path : path.replace(/.*uploads/, '/uploads');
}

function getSafeImageSrc(img) {
  const hd = img.hd_path ? localPath(img.hd_path) : '';
  const thumb = img.thumbnail_path ? localPath(img.thumbnail_path) : '';
  return hd || thumb;
}

function getThumbSrc(img) {
  const src = img.thumbnail_path || img.hd_path || '';
  return /^https?:\/\//.test(src) ? src : src.replace(/.*uploads/, '/uploads');
}

function updatePosition() {
  const inner = document.getElementById('carouselInner');
  inner.style.transform = `translateX(-${currentIndex * 100}%)`;
  document.querySelectorAll('.carousel-thumb').forEach((d, i) => {
    d.classList.toggle('active', i === currentIndex);
  });
}

function updateCounter() {
  document.getElementById('previewCounter').textContent = `${currentIndex + 1} / ${images.length}`;
}

function navigate(dir) {
  const newIdx = currentIndex + dir;
  if (newIdx >= 0 && newIdx < images.length) {
    currentIndex = newIdx;
    currentImage = images[currentIndex];
    updatePosition();
    updateCounter();
    // group 模式下底部面板数据不变，不刷新
    if (!groupId) loadDetail(currentImage.id);
  }
}

function goTo(idx) {
  currentIndex = idx;
  currentImage = images[currentIndex];
  updatePosition();
  updateCounter();
  // group 模式下底部面板数据不变，不刷新
  if (!groupId) loadDetail(currentImage.id);
}

// ── 触摸滑动 ─────────────────────────────────────────
const carousel = document.getElementById('carousel');

carousel.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

carousel.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if (Math.abs(diff) > 60) {
    navigate(diff > 0 ? 1 : -1);
  }
});

// ── 点赞 / 评论（group 模式统一使用锚点 ID）─────────
async function loadDetail(imgId) {
  try {
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const res = await fetch(API + `/images/${imgId}`, { headers });
    const img = await res.json();
    if (img.error) return;

    document.getElementById('panelTitle').textContent = img.title || '无标题';
    document.getElementById('likeCount').textContent = img.likes || 0;
    document.getElementById('commentCount').textContent = '';

    const likeIcon = document.getElementById('likeIcon');
    const btnLike = document.getElementById('btnLike');
    if (img.liked) {
      likeIcon.textContent = '♥';
      btnLike.classList.add('liked');
    } else {
      likeIcon.textContent = '♡';
      btnLike.classList.remove('liked');
    }

    // 保存锚点图详情用于 toggleLike / submitComment
    if (groupId) {
      currentImage = img;
    } else {
      currentImage = img;
    }
    loadComments(imgId);
  } catch {}
}

async function loadComments(imgId) {
  try {
    const res = await fetch(API + `/images/${imgId}/comments`);
    const comments = await res.json();
    document.getElementById('commentCount').textContent = comments.length;
    const list = document.getElementById('commentList');
    if (comments.length === 0) {
      list.innerHTML = '<p class="no-comments">暂无评论</p>';
    } else {
      list.innerHTML = comments.map(c => `
        <div class="comment-item">
          <div class="c-user">${escapeHtml(c.username)}</div>
          <div class="c-text">${escapeHtml(c.content)}</div>
          <div class="c-time">${formatTime(c.created_at)}</div>
        </div>
      `).join('');
    }
  } catch {}
}

async function toggleLike() {
  if (!token) { showToast('请先登录'); return; }
  // group 模式用锚点 ID，单图模式用当前图片 ID
  const targetId = anchorId || currentImage.id;
  try {
    if (currentImage.liked) {
      const res = await fetch(API + `/images/${targetId}/like`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('likeIcon').textContent = '♡';
        document.getElementById('btnLike').classList.remove('liked');
        document.getElementById('likeCount').textContent = data.likes;
        currentImage.liked = false;
      }
    } else {
      const res = await fetch(API + `/images/${targetId}/like`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById('likeIcon').textContent = '♥';
        document.getElementById('btnLike').classList.add('liked');
        document.getElementById('likeCount').textContent = data.likes;
        currentImage.liked = true;
      }
    }
  } catch {}
}

function toggleComment() {
  const panel = document.getElementById('commentList');
  const inputRow = document.getElementById('commentInputRow');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  inputRow.style.display = visible ? 'none' : 'flex';
}

async function submitComment() {
  if (!token) { showToast('请先登录'); return; }
  // group 模式用锚点 ID，单图模式用当前图片 ID
  const targetId = anchorId || currentImage.id;
  const input = document.getElementById('commentInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await fetch(API + `/images/${targetId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      input.value = '';
      loadComments(targetId);
    } else {
      const data = await res.json();
      showToast(data.error || '评论失败');
    }
  } catch { showToast('网络错误'); }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

// ── 键盘导航 ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

// ── 保存图片 ─────────────────────────────────────────
(function() {
  var btn = document.getElementById('saveBtn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var slide = document.querySelector('.carousel-slide:nth-child(' + (currentIndex + 1) + ') img');
    if (!slide) return;
    var url = slide.src;
    var filename = url.split('/').pop().split('?')[0] || 'image.jpg';

    // iOS 端：通过 JSBridge 调用原生保存图片到相册
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      var saved = false;

      // 方式1：WKWebView messageHandlers（最常见）
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveImageToAlbum) {
        window.webkit.messageHandlers.saveImageToAlbum.postMessage({ imageUrl: url });
        saved = true;
      }
      // 方式2：WKWebView messageHandlers（别名 saveImage）
      else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveImage) {
        window.webkit.messageHandlers.saveImage.postMessage({ url: url });
        saved = true;
      }
      // 方式3：通用 JSBridge（常见于混合开发框架）
      else if (window.JSBridge && typeof window.JSBridge.call === 'function') {
        try {
          window.JSBridge.call('saveImageToAlbum', { imageUrl: url });
          saved = true;
        } catch(e) {}
      }
      // 方式4：WebViewJavascriptBridge
      else if (window.WebViewJavascriptBridge) {
        window.WebViewJavascriptBridge.callHandler('saveImageToAlbum', { imageUrl: url }, function(res) {});
        saved = true;
      }

      if (saved) {
        showToast('正在保存到相册...');
      } else {
        // 无桥接回退：跳转全屏图片页，引导长按保存
        var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh}img{max-width:100vw;max-height:100vh;max-height:100dvh;width:auto;height:auto;object-fit:contain}.tip{color:#fff;font-size:14px;position:fixed;top:0;left:0;right:0;text-align:center;padding:12px 0;z-index:10;background:linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)}</style></head><body><div class="tip">请长按图片保存</div><img src="' + url + '"></body></html>';
        document.write(html);
        document.close();
      }
      return;
    }

    // Android 端
    if (/Android/i.test(navigator.userAgent)) {
      if (window.JSBridge && typeof window.JSBridge.call === 'function') {
        try {
          window.JSBridge.call('saveImageToAlbum', { imageUrl: url });
          showToast('正在保存...');
          return;
        } catch(e) {}
      }
      if (window.Android && window.Android.saveImageToAlbum) {
        window.Android.saveImageToAlbum(url);
        showToast('正在保存...');
        return;
      }
      // 回退
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // PC 端：fetch + blob 下载
    fetch(url)
      .then(function(res) { return res.blob(); })
      .then(function(blob) {
        var blobUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 100);
      })
      .catch(function() { showToast('保存失败'); });
  });
})();

// ── 全屏缩放查看器 ───────────────────────────────────
(function() {
  var overlay = document.getElementById('zoomOverlay');
  var zoomImg = document.getElementById('zoomImage');
  var zoomWrap = document.getElementById('zoomImageWrap');
  var zoomClose = document.getElementById('zoomClose');
  var zoomIndicator = document.getElementById('zoomIndicator');
  var carousel = document.getElementById('carousel');

  if (!overlay || !zoomImg || !carousel) return;

  // 状态
  var scale = 1;
  var baseScale = 1;
  var minScale = 1;
  var maxScale = 4;
  var translateX = 0;
  var translateY = 0;
  var isDragging = false;
  var pinchStartDist = 0;
  var pinchStartScale = 1;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragStartTX = 0;
  var dragStartTY = 0;
  var lastTapTime = 0;
  var clickTimer = null;
  var zoomTapTime = 0;
  var touchMoved = false;
  var pinchActive = false;
  var imgNaturalW = 0;
  var imgNaturalH = 0;
  var wrapW = 0;
  var wrapH = 0;

  // 更新图片变换
  function applyTransform(animate) {
    if (animate === false) {
      zoomImg.classList.add('dragging');
    } else {
      zoomImg.classList.remove('dragging');
    }
    zoomImg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
    updateIndicator();
  }

  function updateIndicator() {
    if (scale > baseScale * 1.05) {
      zoomIndicator.textContent = Math.round(scale / baseScale * 100) + '%';
    } else {
      zoomIndicator.textContent = '';
    }
  }

  // 限制平移范围：禁止图片边缘进入视口内部（不留空白）
  // displayW 基于 CSS 盒模型尺寸（offsetWidth），因为 CSS width:100% 已将图片盒约束为视口宽。
  // displayH 用宽高比反推（displayW * imgNaturalH / imgNaturalW），避免 offsetHeight 被 flex stretch 拉伸。
  // flexCenterY 是父容器 align-items:center 产生的隐式 Y 偏移，translate 叠加其上，边界需扣除。
  function clampTranslation() {
    var displayW = zoomImg.offsetWidth * scale;
    var displayH = displayW * imgNaturalH / imgNaturalW;
    // 父容器 flex 居中产生的隐式偏移（X 方向因 width:100% 恒为 0）
    var flexCenterY = (wrapH - zoomImg.offsetHeight) / 2;

    if (displayW <= wrapW) {
      translateX = (wrapW - displayW) / 2;
    } else {
      translateX = Math.max(wrapW - displayW, Math.min(0, translateX));
    }

    if (displayH <= wrapH) {
      translateY = (wrapH - displayH) / 2 - flexCenterY;
    } else {
      translateY = Math.max(wrapH - displayH - flexCenterY, Math.min(-flexCenterY, translateY));
    }
  }

  // 读取图片原始尺寸（用于 clamp 和命中测试，不影响初始定位）
  function readNaturalSize() {
    imgNaturalW = zoomImg.naturalWidth || zoomImg.width || zoomImg.clientWidth || 0;
    imgNaturalH = zoomImg.naturalHeight || zoomImg.height || zoomImg.clientHeight || 0;
  }

  // 打开查看器：始终以 scale(1) 从左上角开始，不做任何自适应
  function openZoom(src) {
    // 固定初始参数
    baseScale = 1;
    minScale = 1;
    maxScale = 3;
    scale = 1;
    translateX = 0;
    translateY = 0;

    // 更新视口尺寸（用于 clamp 和命中测试裁剪）
    wrapW = zoomWrap.clientWidth;
    wrapH = zoomWrap.clientHeight;

    zoomImg.src = src;
    zoomImg.style.transition = 'none';
    applyTransform(false);
    zoomImg.offsetHeight;

    // 图片加载后读取原始尺寸
    function onImgReady() {
      readNaturalSize();
      applyTransform(false);
      zoomImg.offsetHeight;
    }

    zoomImg.onload = onImgReady;
    if (zoomImg.complete && zoomImg.naturalWidth) {
      onImgReady();
    }

    requestAnimationFrame(function() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      zoomImg.style.transition = '';
    });
  }

  // 关闭查看器
  function closeZoom() {
    clearTimeout(clickTimer);
    clickTimer = null;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    zoomImg.src = '';
  }

  // 双击缩放
  function handleDoubleTap(cx, cy) {
    if (scale > baseScale * 1.1) {
      // 当前已放大 → 恢复默认 (scale=1, 左上角)
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform(true);
    } else {
      // 默认 → 放大到 3 倍，以点击位置为中心
      var oldScale = scale;
      var newScale = baseScale * 3;
      // 点击位置在图片坐标系中的偏移
      var ix = (cx - translateX) / oldScale;
      var iy = (cy - translateY) / oldScale;
      scale = newScale;
      translateX = cx - ix * newScale;
      translateY = cy - iy * newScale;
      clampTranslation();
      applyTransform(true);
    }
  }

  // ── 事件绑定 ──

  // 点击轮播图片 → 打开缩放查看器
  carousel.addEventListener('click', function(e) {
    var img = e.target.closest('.carousel-slide img');
    if (!img) return;
    var now = Date.now();
    if (now - lastTapTime < 300) {
      lastTapTime = 0;
      return;
    }
    lastTapTime = now;
    setTimeout(function() {
      if (Date.now() - lastTapTime > 280 && lastTapTime !== 0) {
        openZoom(img.src);
      }
    }, 300);
  });

  // 关闭按钮
  zoomClose.addEventListener('click', function (e) {
    e.stopPropagation();
    closeZoom();
  });

  // 点击图片 → setTimeout 单击关闭
  zoomImg.addEventListener('click', function(e) {
    clearTimeout(clickTimer);
    clickTimer = setTimeout(closeZoom, 250);
  });

  // 移动端 touchend 单击/双击互斥（preventDefault 阻止后续 click 干扰）
  zoomImg.addEventListener('touchend', function(e) {
    if (e.cancelable) e.preventDefault();
    // 有手指未抬起 → 不处理
    if (e.touches.length > 0) return;
    // 捏合结束后不触发点击
    if (pinchActive) { pinchActive = false; return; }
    // 拖拽中不处理点击
    if (isDragging && touchMoved) return;

    var now = Date.now();
    clearTimeout(clickTimer);

    if (zoomTapTime && now - zoomTapTime < 300) {
      // 双击：取消单击 + 缩放
      clickTimer = null;
      zoomTapTime = 0;
      var t = e.changedTouches[0];
      handleDoubleTap(t.clientX, t.clientY);
    } else {
      // 单击：延时关闭
      zoomTapTime = now;
      clickTimer = setTimeout(closeZoom, 250);
    }
  });

  // ── 触摸事件：捏合缩放 + 拖动平移 ──

  overlay.addEventListener('touchstart', function(e) {
    if (e.target === zoomClose) return;
    var touches = e.touches;

    if (touches.length === 2) {
      pinchActive = true;
      pinchStartDist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      pinchStartScale = scale;
      isDragging = false;
    } else if (touches.length === 1) {
      pinchActive = false;
      touchMoved = false;
      // scale=1（未放大）时不允许拖拽
      if (scale <= minScale) return;
      dragStartX = touches[0].clientX;
      dragStartY = touches[0].clientY;
      dragStartTX = translateX;
      dragStartTY = translateY;
      isDragging = true;
    }
  }, { passive: false });

  overlay.addEventListener('touchmove', function(e) {
    var touches = e.touches;

    if (touches.length === 2) {
      e.preventDefault();
      var dist = Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
      var newScale = pinchStartScale * (dist / pinchStartDist);
      newScale = Math.max(0.5, Math.min(maxScale, newScale));

      // 捏合中心点（屏幕坐标）
      var cx = (touches[0].clientX + touches[1].clientX) / 2;
      var cy = (touches[0].clientY + touches[1].clientY) / 2;

      // 中心点在图片局部坐标中的位置
      var ix = (cx - translateX) / scale;
      var iy = (cy - translateY) / scale;

      scale = newScale;
      translateX = cx - ix * scale;
      translateY = cy - iy * scale;

      clampTranslation();
      applyTransform(false);
    } else if (touches.length === 1 && isDragging) {
      touchMoved = true;
      var dx = touches[0].clientX - dragStartX;
      var dy = touches[0].clientY - dragStartY;
      translateX = dragStartTX + dx;
      translateY = dragStartTY + dy;
      clampTranslation();
      applyTransform(false);
    }
  }, { passive: false });

  overlay.addEventListener('touchend', function(e) {
    if (e.touches.length === 0) {
      isDragging = false;
      // 缩小到 0.8 以下 → 回弹到 scale=1 + translate(0,0)，CSS transition 平滑动画
      if (scale < 0.8) {
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform(true);
      }
    } else if (e.touches.length === 1) {
      if (scale <= minScale) { isDragging = false; return; }
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragStartTX = translateX;
      dragStartTY = translateY;
      isDragging = true;
    }
  });

  // ── 鼠标滚轮缩放（PC 调试用） ──
  overlay.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.15 : 0.15;
      var newScale = Math.max(minScale, Math.min(maxScale, scale * (1 + delta)));
      var mx = e.clientX;
      var my = e.clientY;
      var ix = (mx - translateX) / scale;
      var iy = (my - translateY) / scale;
      scale = newScale;
      translateX = mx - ix * scale;
      translateY = my - iy * scale;
      clampTranslation();
      applyTransform(false);
    }
  }, { passive: false });

  // ── 键盘关闭 ──
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeZoom();
    }
  });
})();

// ── 启动 ─────────────────────────────────────────────
loadImages();
