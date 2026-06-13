// upload-page.js - 批量上传页面逻辑
const API = '/api';
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; }

let selectedFiles = [];

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const submitBtn = document.getElementById('submitBtn');

// 加载分类
fetch(API + '/categories')
  .then(r => r.json())
  .then(cats => {
    const sel = document.getElementById('category');
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });

// 拖拽 & 点击
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles(Array.from(e.dataTransfer.files));
});

fileInput.addEventListener('change', () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

function addFiles(files) {
  const images = files.filter(f => f.type.startsWith('image/'));
  if (selectedFiles.length + images.length > 20) {
    alert('最多上传 20 张图片');
    return;
  }
  selectedFiles = selectedFiles.concat(images);
  renderPreview();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderPreview();
}

function renderPreview() {
  previewGrid.innerHTML = selectedFiles.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div class="preview-item">
      <img src="${url}" alt="${f.name}" onerror="setImgFallback(this)">
      <button class="remove-btn" onclick="removeFile(${i})">×</button>
    </div>`;
  }).join('');
  submitBtn.disabled = selectedFiles.length === 0;
  submitBtn.textContent = `上传 ${selectedFiles.length > 0 ? '(' + selectedFiles.length + ' 张)' : '(请先选择图片)'}`;
}

// 上传
submitBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  const categoryId = document.getElementById('category').value;
  if (!categoryId) { alert('请选择分类'); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = '上传中...';

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value.trim());
  formData.append('category_id', categoryId);
  formData.append('tags', document.getElementById('tags').value.trim());
  selectedFiles.forEach(f => formData.append('images', f));

  try {
    const res = await fetch(API + '/images/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      alert(`成功上传 ${data.images.length} 张图片，等待审核`);
      window.location.href = '/';
    } else {
      alert(data.error || '上传失败');
    }
  } catch {
    alert('网络错误');
  }
  submitBtn.disabled = false;
  submitBtn.textContent = '上传';
});
