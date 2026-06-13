// profile-page.js - 个人资料页面逻辑
const API = '/api';
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; }

async function loadProfile() {
  try {
    const res = await fetch(API + '/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { localStorage.clear(); window.location.href = '/login.html'; return; }
    const user = await res.json();
    document.getElementById('emailField').value = user.email;
    document.getElementById('usernameField').value = user.username || '';
    document.getElementById('bioField').value = user.bio || '';
    if (user.age !== null && user.age !== undefined) {
      document.getElementById('ageField').value = user.age;
    }
    if (user.avatar) document.getElementById('avatarPreview').src = user.avatar;
  } catch {}
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const username = document.getElementById('usernameField').value.trim();
  const bio = document.getElementById('bioField').value.trim();
  const ageVal = document.getElementById('ageField').value.trim();
  const btn = document.getElementById('saveBtn');
  const msg = document.getElementById('msg');

  const body = { username, bio };
  if (ageVal !== '') {
    const ageNum = parseInt(ageVal);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      msg.style.display = 'block';
      msg.className = 'msg error';
      msg.textContent = '年龄需在 1-120 之间';
      return;
    }
    body.age = ageNum;
  }

  btn.disabled = true;
  try {
    const res = await fetch(API + '/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    msg.style.display = 'block';
    if (res.ok) {
      msg.className = 'msg success';
      msg.textContent = '保存成功';
      localStorage.setItem('username', username);
    } else {
      msg.className = 'msg error';
      msg.textContent = data.error || '保存失败';
    }
  } catch {
    msg.style.display = 'block';
    msg.className = 'msg error';
    msg.textContent = '网络错误';
  }
  btn.disabled = false;
});

loadProfile();
