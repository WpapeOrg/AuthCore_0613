// my-images-page.js - 我的发布页面逻辑
const API = '/api';
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; }

let allImages = [];
let currentStatus = 'all';

// 关闭按钮 SVG
const closeSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

async function loadImages() {
  try {
    const res = await fetch(API + '/user/images', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { localStorage.clear(); window.location.href = '/login.html'; return; }
    allImages = await res.json();
    renderImages();
  } catch {}
}

function renderImages() {
  const filtered = currentStatus === 'all' ? allImages : allImages.filter(i => i.status === currentStatus);
  const grid = document.getElementById('imageGrid');
  const empty = document.getElementById('emptyMsg');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = filtered.map(img => {
    const thumbSrc = img.thumbnail_path ? img.thumbnail_path.replace(/.*uploads/, '/uploads') : '';
    const statusLabel = { approved: '已通过', pending: '审核中', rejected: '已拒绝' }[img.status] || img.status;
    return `<div class="image-card" id="mycard-${img.id}">
      <img src="${thumbSrc}" alt="${img.title}" loading="lazy" onerror="setImgFallback(this)">
      <button class="card-close-btn" onclick="event.stopPropagation();delistImage(${img.id})" title="下架">${closeSVG}</button>
      <div class="info">
        <div class="title">${escapeHtml(img.title)}</div>
        <div class="meta">
          <span class="status-badge status-${img.status}">${statusLabel}</span>
          <span>${formatDate(img.created_at)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function delistImage(id) {
  if (!confirm('确定要下架这张图片吗？图片将从服务器永久删除，不可恢复。')) return;
  try {
    const res = await fetch(API + `/images/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      document.getElementById('mycard-' + id)?.remove();
      allImages = allImages.filter(i => i.id !== id);
      if (document.querySelectorAll('.image-card').length === 0) {
        document.getElementById('emptyMsg').style.display = 'block';
        document.getElementById('imageGrid').style.display = 'none';
      }
    } else {
      const data = await res.json();
      alert(data.error || '下架失败');
    }
  } catch { alert('网络错误'); }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()}`;
}

// Tab 切换
document.querySelectorAll('.status-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentStatus = btn.dataset.status;
    renderImages();
  });
});

loadImages();
