/* ============================================================
   Image Gallery App v3 - 页面化 + 响应式
   ============================================================ */

const API = "/api";

// ── State ─────────────────────────────────────────────
const state = {
  sort: "newest",
  category: "",
  images: [],
  page: 1,
  totalPages: 1,
  loading: false,
  user: null,
  role: null,
  pendingCount: 0,
};

// ── DOM Refs ──────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const navbarLinks = $("#navbarLinks");
const gallery = $("#gallery");
const userArea = $("#userArea");
const loginBtn = $("#loginBtn");
const userName = $("#userName");
const userAvatar = $("#userAvatar");
const userDropdown = $("#userDropdown");

// ── SVG Icons ─────────────────────────────────────────
const SVG = {
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  heartFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  landscape: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17l5-5 4 4 4-8 7 9"/><rect x="2" y="14" width="20" height="8" rx="1"/></svg>`,
  anime: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  portrait: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  nature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20h10"/><path d="M12 20v-8"/><path d="M8 12c-2-3 0-7 4-7s6 4 4 7"/><path d="M8 12c-2 2 0 5 4 5s6-3 4-5"/></svg>`,
  animal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5a7 7 0 00-7 7c0 2 1 4 3 4.5V21l3-2 3 2v-4.5c2-.5 3-2.5 3-4.5a7 7 0 00-7-7z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>`,
  architecture: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9" y2="8"/><line x1="15" y1="6" x2="15" y2="8"/><line x1="9" y1="12" x2="9" y2="14"/><line x1="15" y1="12" x2="15" y2="14"/><line x1="9" y1="18" x2="9" y2="20"/><line x1="15" y1="18" x2="15" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/></svg>`,
  illustration: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  approve: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  spinner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"><animate attributeName="stroke-dashoffset" values="32;0" dur="1.5s" repeatCount="indefinite"/></circle></svg>`,
};

function icon(n) {
  return SVG[n] || SVG.default;
}

// ── Helper ──────────────────────────────────────────
function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function apiGet(path) {
  return fetch(API + path, { headers: authHeaders() }).then((r) => r.json());
}

// ── Category Map (icon → id) ────────────────────────
let categoryMap = {};
let categoryList = []; // 原始分类列表（含 18+）

async function loadCategories() {
  try {
    const cats = await apiGet('/categories');
    categoryList = cats;
    cats.forEach(c => { categoryMap[c.icon] = c.id; });
    renderSidebar();
  } catch {}
}

// ── 侧边栏渲染（根据用户年龄决定是否显示 18+）────────
const categoryIconSvgs = {
  wallpaper: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17l5-5 4 4 4-8 7 9h0"/><rect x="2" y="14" width="20" height="8" rx="1"/></svg>`,
  anime: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  beauty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  other: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  adult: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L15 9 L22 9 L16 14 L18 21 L12 17 L6 21 L8 14 L2 9 L9 9 Z"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/></svg>`,
};

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // 检查当前用户年龄是否 > 18
  const userAge = state.user ? state.user.age : null;
  const canSeeAdult = userAge !== null && userAge !== undefined && userAge > 18;

  // 过滤掉 18+ 分类（如果不满足条件）
  const visibleCats = categoryList.filter(c => {
    if (c.icon === 'adult') return canSeeAdult;
    return true;
  });

  let html = `
  <div class="sidebar-item active" data-category="" onclick="selectCategory('', this)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    <span>全部</span>
  </div>`;

  visibleCats.forEach(c => {
    const svg = categoryIconSvgs[c.icon] || categoryIconSvgs.default;
    html += `
    <div class="sidebar-item" data-category="${c.icon}" onclick="selectCategory('${c.icon}', this)">
      ${svg}
      <span>${c.name}</span>
    </div>`;
  });

  sidebar.innerHTML = html;
}

// ── Init ────────────────────────────────────────────
async function init() {
  // Render skeleton placeholders immediately before any async ops
  gallery.innerHTML = '';
  gallery.appendChild(renderSkeletonGrid(8));

  await checkAuth();
  window.__isAdmin = (state.role === 'admin');
  await loadCategories();
  updateNavbar();
  renderSortTabs();
  await loadImages();
  setupInfiniteScroll();
  if (state.role === "admin") await loadPendingCount();
}

async function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(API + "/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const u = await res.json();
      state.user = u;
      state.role = u.role;
      localStorage.setItem("username", u.username);
      if (u.role) localStorage.setItem("role", u.role);
    } else {
      clearAuth();
    }
  } catch {
    state.user = null;
  }
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  state.user = null;
  state.role = null;
}

// ── Navbar ──────────────────────────────────────────
function updateNavbar() {
  const fabUpload = document.getElementById("fabUpload");
  if (state.user) {
    loginBtn.classList.add("hidden");
    userArea.classList.remove("hidden");
    userName.textContent = state.user.username;
    userAvatar.textContent = state.user.username.charAt(0).toUpperCase();
    if (fabUpload) fabUpload.classList.remove("hidden");
    const adminLink = document.getElementById("adminLink");
    if (adminLink) {
      adminLink.style.display = state.role === "admin" ? "block" : "none";
    }
    const profileLink = document.getElementById("profileLink");
    const myImagesLink = document.getElementById("myImagesLink");
    if (profileLink) profileLink.style.display = "block";
    if (myImagesLink) myImagesLink.style.display = "block";
  } else {
    loginBtn.classList.remove("hidden");
    userArea.classList.add("hidden");
    if (fabUpload) fabUpload.classList.add("hidden");
  }
}

function toggleDropdown() {
  userDropdown.classList.toggle("show");
}

function logout() {
  clearAuth();
  userDropdown.classList.remove("show");
  updateNavbar();
  state.page = 1;
  state.images = [];
  gallery.innerHTML = "";
  gallery.classList.remove("hidden");
  const emptyEl = document.getElementById("emptyState");
  if (emptyEl) emptyEl.classList.add("hidden");
  loadImages();
}

document.addEventListener("click", (e) => {
  if (!userArea.contains(e.target)) userDropdown.classList.remove("show");
});

// ── Sort Tabs ───────────────────────────────────────
function renderSortTabs() {
  const role = state.role || localStorage.getItem("role");
  let tabs = `
    <a class="active" data-sort="newest" onclick="selectSort('newest')">最新</a>
    <a data-sort="hottest" onclick="selectSort('hottest')">最热门</a>
    <a data-sort="most_liked" onclick="selectSort('most_liked')">最爱</a>
  `;
  if (role === "admin") {
    tabs += `<a href="/admin.html" class="admin-tab-link">图片审批<span class="badge-dot" id="pendingBadge" style="display:none">0</span></a>`;
  }
  navbarLinks.innerHTML = tabs;
}

async function loadPendingCount() {
  try {
    const data = await apiGet("/images/pending");
    const count = Array.isArray(data) ? data.length : 0;
    state.pendingCount = count;
    const badge = document.getElementById("pendingBadge");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline" : "none";
    }
  } catch {}
}

function selectSort(sort) {
  if (state.sort === sort) return;
  state.sort = sort;
  state.page = 1;
  state.totalPages = 1;
  state.images = [];
  state.loading = false;
  gallery.innerHTML = "";
  gallery.classList.remove("hidden");
  const emptyEl = document.getElementById("emptyState");
  if (emptyEl) emptyEl.classList.add("hidden");
  navbarLinks.querySelectorAll("a[data-sort]").forEach((a) => {
    a.classList.toggle("active", a.dataset.sort === sort);
  });
  loadImages();
}

function selectCategory(categoryId, el) {
  if (state.category === categoryId) return;
  state.category = categoryId;
  state.page = 1;
  state.totalPages = 1;
  state.images = [];
  state.loading = false;
  gallery.innerHTML = "";
  gallery.classList.remove("hidden");
  const emptyEl = document.getElementById("emptyState");
  if (emptyEl) emptyEl.classList.add("hidden");
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.category === categoryId);
  });
  closeMobileSidebar();
  loadImages();
}

// ── Mobile Sidebar ──────────────────────────────────
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("open");
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.remove("open");
  overlay.classList.remove("open");
}

// ── Images ──────────────────────────────────────────
function renderSkeletonGrid(n) {
  const grid = document.createElement("div");
  grid.className = "skeleton-grid";
  for (let i = 0; i < n; i++) {
    const h = 180 + Math.floor(Math.random() * 120);
    grid.innerHTML += `<div class="skeleton-card"><div class="skeleton skeleton-img" style="height:${h}px"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div>`;
  }
  return grid;
}

// ── Lazy load image observer ───────────────────────
let lazyObserver = null;
function ensureLazyObserver() {
  if (lazyObserver) return;
  lazyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const skeleton = e.target;
        const img = document.createElement("img");
        const src = skeleton.dataset.src;
        const alt = skeleton.dataset.alt || "";
        // Preserve skeleton height on img & card-img-wrap to prevent collapse
        const skelHeight = skeleton.style.height;
        if (skelHeight) {
          img.style.height = skelHeight;
          const wrap = skeleton.parentElement;
          if (wrap) wrap.style.minHeight = skelHeight;
        }
        img.src = src;
        img.alt = alt;
        img.className = "lazy-loading";
        img.onerror = function () {
          setImgFallback(this);
          this.style.height = "";
          const wrap = this.parentElement;
          if (wrap) wrap.style.minHeight = "";
          this.classList.replace("lazy-loading", "lazy-loaded");
        };
        img.onload = () => {
          img.style.height = "";
          const wrap = img.parentElement;
          if (wrap) wrap.style.minHeight = "";
          img.classList.replace("lazy-loading", "lazy-loaded");
        };
        skeleton.replaceWith(img);
        lazyObserver.unobserve(skeleton);
      });
    },
    { rootMargin: "400px" },
  );
}

async function loadImages() {
  if (state.loading || state.page > state.totalPages) return;
  state.loading = true;
  const emptyEl = document.getElementById("emptyState");

  if (state.page === 1) {
    gallery.innerHTML = "";
    gallery.classList.remove("hidden");
    if (emptyEl) emptyEl.classList.add("hidden");
    gallery.appendChild(renderSkeletonGrid(8));
  }

  try {
    let url = `${API}/images?page=${state.page}&limit=20&sort=${state.sort}`;
    if (state.category) url += `&category_id=${categoryMap[state.category] || state.category}`;
    const res = await fetch(url, { headers: authHeaders() });
    const data = await res.json();
    console.log("data", data);
    state.images.push(...(data.images || []));
    state.totalPages = Math.ceil((data.total || 0) / (data.limit || 20));
    state.loading = false;

    if (state.page === 1) gallery.innerHTML = "";
    if (state.images.length === 0 && state.page === 1) {
      gallery.classList.add("hidden");
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    renderGallery(data.images || []);
  } catch (e) {
    state.loading = false;
    if (state.page === 1) {
      gallery.classList.add("hidden");
      if (emptyEl) emptyEl.classList.remove("hidden");
    }
  }
}

function renderGallery(images) {
  ensureLazyObserver();
  images.forEach((img, idx) => {
    const globalIdx = state.images.length - images.length + idx;
    const groupCount = img.group_count || 0;
    const badgeHtml =
      groupCount > 1 ? `<span class="group-badge">+${groupCount}</span>` : "";
    const thumbSrc = img.thumbnail_path
      ? (/^https?:\/\//.test(img.thumbnail_path) ? img.thumbnail_path : img.thumbnail_path.replace(/.*\/uploads/, "/uploads"))
      : "";

    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openPreview(img);

    // Estimate skeleton height based on image aspect ratio
    let skelH = 220;
    if (img.width && img.height && img.width > 0) {
      // map aspect ratio: wide images get shorter skeleton
      const ratio = img.width / img.height;
      if (ratio > 1.5) skelH = 140;
      else if (ratio > 1) skelH = 180;
      else if (ratio < 0.6) skelH = 300;
    }

    card.innerHTML = `
      <div class="card-img-wrap">
        ${badgeHtml}
        <div class="skeleton" style="height:${skelH}px" data-src="${thumbSrc}" data-alt="${escapeHtml(img.title)}"></div>
      </div>
      <button class="card-like-btn" data-imgid="${img.id}" onclick="event.stopPropagation();toggleCardLike(${img.id}, ${globalIdx}, this)">
        ${img.user_liked ? SVG.heartFilled : SVG.heart}
        <span>${img.likes || 0}</span>
      </button>
      <div class="card-info">
        <div class="card-title">${escapeHtml(img.title)}</div>
        <div class="card-meta">
          <span>${escapeHtml(img.category_name || "")}</span>
          <span>${img.width}×${img.height}</span>
        </div>
      </div>
    `;
    // Observe skeleton for lazy loading
    const skeleton = card.querySelector(".skeleton");
    if (skeleton) lazyObserver.observe(skeleton);
    gallery.appendChild(card);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Open Preview (Page) ─────────────────────────────
function openPreview(img) {
  let url = `/preview.html?id=${img.id}`;
  if (img.group_id) url += `&group_id=${img.group_id}`;
  window.location.href = url;
}

// ── Card Like ───────────────────────────────────────
async function toggleCardLike(imageId, idx, btnEl) {
  if (!state.user) {
    window.location.href = "/login.html";
    return;
  }
  const img = state.images[idx];
  if (!img) return;
  const liked = img.user_liked || false;
  const method = liked ? "DELETE" : "POST";
  try {
    const res = await fetch(`${API}/images/${imageId}/like`, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) return;
    img.likes = data.likes;
    img.user_liked = data.liked;
    btnEl.querySelector("span").textContent = data.likes;
    btnEl.innerHTML =
      (data.liked ? SVG.heartFilled : SVG.heart) + `<span>${data.likes}</span>`;
    btnEl.classList.toggle("liked", data.liked);
  } catch {}
}

// ── Infinite Scroll ─────────────────────────────────
function setupInfiniteScroll() {
  const sentinel = document.createElement("div");
  sentinel.id = "scrollSentinel";
  sentinel.style.height = "1px";
  const container = document.getElementById("homeContentArea");
  (container || gallery.parentElement).appendChild(sentinel);
  const observer = new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        !state.loading &&
        state.page < state.totalPages
      ) {
        state.page++;
        loadImages();
      }
    },
    { rootMargin: "300px" },
  );
  observer.observe(sentinel);
}

// ── Upload redirect ─────────────────────────────────
function goUpload() {
  if (!state.user) {
    window.location.href = "/login.html";
    return;
  }
  window.location.href = "/upload.html";
}

// ── Scroll to top ───────────────────────────────────
function scrollToTop() {
  var area = document.querySelector('.home-content-area');
  if (area) area.scrollTop = 0;
}

// ── BFCache 恢复：从预览返回首页时清空路由并修复布局 ─────────
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    // 从预览返回时清空路由，防止携带预览页的 hash
    if (window.location.hash) {
      window.location.hash = '';
    }
  }
});

// ── Start ───────────────────────────────────────────
init();

