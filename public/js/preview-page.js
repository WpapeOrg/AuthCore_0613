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

    // 手机端：通过原生层保存到相册
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.saveImage) {
        window.webkit.messageHandlers.saveImage.postMessage({ url: url });
        showToast('正在保存...');
      } else {
        // 回退：跳转图片，用 styled HTML 避免留白
        var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh}img{max-width:100vw;max-height:100vh;max-height:100dvh;width:auto;height:auto;object-fit:contain}.tip{color:#fff;font-size:14px;position:fixed;top:0;left:0;right:0;text-align:center;padding:12px 0;z-index:10;background:linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)}</style></head><body><div class="tip">请长按保存</div><img src="' + url + '"></body></html>';
        document.write(html);
        document.close();
      }
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

// ── 启动 ─────────────────────────────────────────────
loadImages();
