// admin-page.js - 图片审批页面逻辑
const API = '/api';
const token = localStorage.getItem('token');

async function checkAdmin() {
  if (!token) { window.location.href = '/login.html'; return false; }
  try {
    const res = await fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { localStorage.clear(); window.location.href = '/login.html'; return false; }
    const user = await res.json();
    if (user.role !== 'admin') { alert('无权访问'); window.location.href = '/'; return false; }
  } catch { window.location.href = '/'; return false; }
  return true;
}

async function loadPending() {
  try {
    const res = await fetch(API + '/images/pending', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const images = await res.json();
    document.getElementById('pendingCount').textContent = images.length;
    const grid = document.getElementById('adminGrid');
    const empty = document.getElementById('emptyMsg');

    if (images.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = images.map(img => {
      const thumbSrc = img.thumbnail_path ? img.thumbnail_path.replace(/.*uploads/, '/uploads') : '';
      return `<div class="admin-card" id="card-${img.id}">
        <img src="${thumbSrc}" alt="${img.title}" loading="lazy" onerror="setImgFallback(this)">
        <div class="info">
          <div class="title">${escapeHtml(img.title)}</div>
          <div class="meta">上传者: ${escapeHtml(img.uploader_name || '未知')}</div>
          <div class="actions">
            <button class="btn-approve" onclick="approveImage(${img.id})">通过</button>
            <button class="btn-reject" onclick="rejectImage(${img.id})">拒绝</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch {}
}

async function approveImage(id) {
  try {
    const res = await fetch(API + `/images/${id}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      document.getElementById('card-' + id).remove();
      updateCount();
    } else {
      const data = await res.json();
      alert(data.error || '操作失败');
    }
  } catch { alert('网络错误'); }
}

async function rejectImage(id) {
  try {
    const res = await fetch(API + `/images/${id}/reject`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      document.getElementById('card-' + id).remove();
      updateCount();
    } else {
      const data = await res.json();
      alert(data.error || '操作失败');
    }
  } catch { alert('网络错误'); }
}

function updateCount() {
  const count = document.querySelectorAll('.admin-card').length;
  document.getElementById('pendingCount').textContent = count;
  if (count === 0) document.getElementById('emptyMsg').style.display = 'block';
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

checkAdmin().then(ok => { if (ok) loadPending(); });
