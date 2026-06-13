// auth-page.js - 登录/注册页面逻辑
const API = '/api';
let isLogin = true;

function toggleAuthMode() {
  isLogin = !isLogin;
  document.getElementById('formTitle').textContent = isLogin ? '登录' : '注册';
  document.getElementById('formSub').textContent = isLogin ? '还没有账号？' : '已有账号？';
  document.getElementById('toggleForm').textContent = isLogin ? '立即注册' : '去登录';
  document.getElementById('submitBtn').textContent = isLogin ? '登录' : '注册';
  document.getElementById('usernameGroup').style.display = isLogin ? 'none' : 'block';
  clearMsgs();
}

function showMsg(elId, text, isError) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.style.display = 'block';
  el.className = isError ? 'error-msg' : 'success-msg';
}
function clearMsgs() {
  document.getElementById('errorMsg').style.display = 'none';
  document.getElementById('successMsg').style.display = 'none';
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsgs();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) return showMsg('errorMsg', '请填写邮箱和密码', true);
  if (!isLogin && !username) return showMsg('errorMsg', '请填写用户名', true);

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '处理中...';

  try {
    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin ? { email, password } : { username, email, password };
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username || username);
      if (data.role) localStorage.setItem('role', data.role);
      showMsg('successMsg', (isLogin ? '登录成功' : '注册成功') + '，正在跳转...', false);
      setTimeout(() => { window.location.href = '/'; }, 800);
    } else {
      showMsg('errorMsg', data.error || '操作失败', true);
    }
  } catch {
    showMsg('errorMsg', '网络错误', true);
  }
  btn.disabled = false;
  btn.textContent = isLogin ? '登录' : '注册';
});
