// admin-page.js - 图片审批页面逻辑
function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('show'); });
  setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 2000);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

const API = '/api';
const token = localStorage.getItem('token');
let selectedIds = new Set();
let allImages = [];

async function checkAdmin() {
  if (!token) { window.location.href = '/login.html'; return false; }
  try {
    const res = await fetch(API + '/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { localStorage.clear(); window.location.href = '/login.html'; return false; }
    const user = await res.json();
    if (user.role !== 'admin') { showToast('无权访问'); window.location.href = '/'; return false; }
  } catch { window.location.href = '/'; return false; }
  return true;
}

function formatTime(ts) {
  var d = new Date(ts);
  var pad = function(n) { return n < 10 ? '0' + n : n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function getFileTypeDesc(filename) {
  if (!filename) return '未知';
  var ext = filename.split('.').pop().toLowerCase();
  var map = { jpg: 'JPG', jpeg: 'JPEG', png: 'PNG', gif: 'GIF', webp: 'WebP', bmp: 'BMP' };
  return map[ext] || ext.toUpperCase();
}

async function loadPending() {
  try {
    const res = await fetch(API + '/images/pending', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    allImages = await res.json();
    selectedIds.clear();
    updateBatchUI();
    document.getElementById('pendingCount').textContent = allImages.length;
    var grid = document.getElementById('adminGrid');
    var empty = document.getElementById('emptyMsg');

    if (allImages.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      document.getElementById('selectAllLabel').style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    document.getElementById('selectAllLabel').style.display = '';
    document.getElementById('selectAllCheckbox').checked = false;

    grid.innerHTML = allImages.map(function(img) {
      var thumbSrc = img.thumbnail_path ? img.thumbnail_path.replace(/.*uploads/, '/uploads') : '';
      var hdFilename = img.hd_path || '';
      var fileType = getFileTypeDesc(hdFilename);
      var timeStr = img.created_at ? formatTime(img.created_at) : '';
      return '<div class="admin-card" id="card-' + img.id + '">'
        + '<input type="checkbox" class="card-checkbox" data-id="' + img.id + '" onchange="toggleCardSelect(' + img.id + ', this)" onclick="event.stopPropagation()">'
        + '<img src="' + thumbSrc + '" alt="' + escapeHtml(img.title) + '" loading="lazy" onerror="setImgFallback(this)">'
        + '<div class="info">'
        + '<div class="title">' + escapeHtml(img.title) + '</div>'
        + '<div class="meta">上传者: ' + escapeHtml(img.uploader_name || '未知') + '</div>'
        + '<div class="meta-row"><span>' + escapeHtml(img.category_name || '未分类') + '</span><span>' + timeStr + '</span></div>'
        + '<div class="actions">'
        + '<button class="btn-approve" onclick="event.stopPropagation();approveImage(' + img.id + ')">通过</button>'
        + '<button class="btn-reject" onclick="event.stopPropagation();rejectImage(' + img.id + ')">拒绝</button>'
        + '</div></div></div>';
    }).join('');
  } catch {}
}

function toggleSelectAll() {
  var checked = document.getElementById('selectAllCheckbox').checked;
  if (checked) {
    allImages.forEach(function(img) { selectedIds.add(img.id); });
  } else {
    selectedIds.clear();
  }
  var checkboxes = document.querySelectorAll('.card-checkbox');
  checkboxes.forEach(function(cb) { cb.checked = checked; });
  updateBatchUI();
}

function toggleCardSelect(id, cb) {
  if (cb.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
    document.getElementById('selectAllCheckbox').checked = false;
  }
  updateBatchUI();
}

function updateBatchUI() {
  var toolbar = document.getElementById('batchToolbar');
  var count = selectedIds.size;
  document.getElementById('batchCount').textContent = count;
  document.getElementById('batchCount2').textContent = count;
  var disabled = count === 0;
  document.getElementById('btnBatchApprove').disabled = disabled;
  document.getElementById('btnBatchReject').disabled = disabled;
  if (count > 0) {
    toolbar.classList.add('visible');
  } else {
    toolbar.classList.remove('visible');
  }
}

async function batchAction(action) {
  if (selectedIds.size === 0) return;
  var label = action === 'approve' ? '通过' : '拒绝';
  var ok = await showConfirm({ title: '批量操作', message: '确定要批量' + label + ' ' + selectedIds.size + ' 张图片吗？' });
  if (!ok) return;

  try {
    var res = await fetch(API + '/images/approve-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: action })
    });
    var data = await res.json();
    if (res.ok) {
      showToast(data.message);
      selectedIds.clear();
      updateBatchUI();
      loadPending();
    } else {
      showToast(data.error || '操作失败');
    }
  } catch { showToast('网络错误'); }
}

async function approveImage(id) {
  try {
    var res = await fetch(API + '/images/' + id + '/approve', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      document.getElementById('card-' + id).remove();
      updateCount();
    } else {
      var data = await res.json();
      showToast(data.error || '操作失败');
    }
  } catch { showToast('网络错误'); }
}

async function rejectImage(id) {
  try {
    var res = await fetch(API + '/images/' + id + '/reject', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      document.getElementById('card-' + id).remove();
      updateCount();
    } else {
      var data = await res.json();
      showToast(data.error || '操作失败');
    }
  } catch { showToast('网络错误'); }
}

function updateCount() {
  var count = document.querySelectorAll('.admin-card').length;
  document.getElementById('pendingCount').textContent = count;
  if (count === 0) document.getElementById('emptyMsg').style.display = 'block';
}

checkAdmin().then(function(ok) { if (ok) loadPending(); });
