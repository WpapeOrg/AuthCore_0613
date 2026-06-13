/* ============================================================
   Import Page - 批量导入图片
   ============================================================ */

const API = '/api';

// ── DOM ───────────────────────────────────────────────
const loginRequired = document.getElementById('loginRequired');
const importContent = document.getElementById('importContent');
const categorySelect = document.getElementById('categorySelect');
const jsonInput = document.getElementById('jsonInput');
const previewCount = document.getElementById('previewCount');
const importBtn = document.getElementById('importBtn');
const importResult = document.getElementById('importResult');

// ── Auth ──────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ── 校验登录 ─────────────────────────────────────────
async function checkAuth() {
  const token = getToken();
  if (!token) {
    loginRequired.style.display = 'block';
    return false;
  }
  // 验证 token 有效性
  try {
    const res = await fetch(API + '/categories', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      loginRequired.style.display = 'block';
      return false;
    }
  } catch {
    loginRequired.style.display = 'block';
    return false;
  }
  importContent.style.display = 'block';
  return true;
}

// ── 加载分类 ──────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(API + '/categories');
    const cats = await res.json();
    categorySelect.innerHTML = cats.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
    // 默认选中第一个分类
    if (cats.length > 0) {
      categorySelect.value = cats[0].id;
    }
  } catch {
    categorySelect.innerHTML = '<option value="">加载失败</option>';
  }
}

// ── 实时预览 JSON 解析 ───────────────────────────────
jsonInput.addEventListener('input', () => {
  const val = jsonInput.value.trim();
  if (!val) {
    previewCount.textContent = '';
    return;
  }
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      previewCount.textContent = `解析成功，共 ${parsed.length} 条记录`;
      previewCount.style.color = '#2ecc71';
    } else {
      previewCount.textContent = '错误：JSON 必须是一个数组 [...]';
      previewCount.style.color = '#e74c3c';
    }
  } catch (e) {
    previewCount.textContent = 'JSON 格式错误：' + e.message;
    previewCount.style.color = '#e74c3c';
  }
});

// ── 清空表单 ─────────────────────────────────────────
function clearForm() {
  jsonInput.value = '';
  previewCount.textContent = '';
  importResult.className = 'import-result';
  importResult.style.display = 'none';
  importResult.innerHTML = '';
}

// ── 执行导入 ─────────────────────────────────────────
async function doImport() {
  importResult.className = 'import-result';
  importResult.style.display = 'none';
  importResult.innerHTML = '';

  const raw = jsonInput.value.trim();
  if (!raw) {
    showResult('请输入图片数据 JSON', 'error');
    return;
  }

  let images;
  try {
    images = JSON.parse(raw);
  } catch (e) {
    showResult('JSON 格式错误：' + e.message, 'error');
    return;
  }

  if (!Array.isArray(images)) {
    showResult('数据格式错误：必须是 JSON 数组 [...]', 'error');
    return;
  }

  if (images.length === 0) {
    showResult('数组为空，没有可导入的数据', 'error');
    return;
  }

  // 补全默认分类
  const defaultCategoryId = parseInt(categorySelect.value) || null;
  const payload = images.map(img => ({
    ...img,
    category_id: img.category_id || defaultCategoryId || 49,
  }));

  importBtn.disabled = true;
  importBtn.textContent = '导入中...';

  try {
    const res = await fetch(API + '/images/import', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ images: payload }),
    });

    const data = await res.json();

    if (!res.ok) {
      showResult(data.error || '导入失败', 'error');
      return;
    }

    const { success, failed, errors } = data;

    if (failed === 0) {
      showResult(`导入完成：成功 ${success} 条`, 'success');
    } else {
      let html = `导入完成：成功 <b>${success}</b> 条，失败 <b>${failed}</b> 条`;
      if (errors && errors.length > 0) {
        html += '<ul>' + errors.slice(0, 10).map(e =>
          `<li>${escapeHtml(e.title || 'unknown')}: ${escapeHtml(e.reason)}</li>`
        ).join('');
        if (errors.length > 10) {
          html += `<li>... 还有 ${errors.length - 10} 条失败记录</li>`;
        }
        html += '</ul>';
      }
      showResult(html, failed === images.length ? 'error' : 'partial');
    }
  } catch (e) {
    showResult('网络错误：' + e.message, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = '导入到图库';
  }
}

// ── 显示结果 ─────────────────────────────────────────
function showResult(message, type) {
  importResult.innerHTML = message;
  importResult.className = 'import-result show ' + type;
  importResult.style.display = 'block';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 初始化 ────────────────────────────────────────────
(async () => {
  const authed = await checkAuth();
  if (authed) {
    await loadCategories();
  }
})();
