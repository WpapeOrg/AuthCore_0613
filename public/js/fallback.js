/* ============================================================
   统一图片兜底模块 — 所有页面引用此文件即可
   使用方法：
     HTML:  <img ... onerror="setImgFallback(this)">
     JS:    img.onerror = function() { setImgFallback(this); };
   修改兜底样式只需改下方 SVG，全局生效
   ============================================================ */

window.showConfirm = function({ title, message, confirmText, cancelText, danger }) {
  title = title || '提示';
  message = message || '';
  confirmText = confirmText || '确定';
  cancelText = cancelText || '取消';
  danger = danger || false;
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.innerHTML =
      '<div class="custom-alert-box">' +
        '<div class="custom-alert-title">' + title + '</div>' +
        (message ? '<div class="custom-alert-message">' + message + '</div>' : '') +
        '<div class="custom-alert-buttons">' +
          '<button class="custom-alert-btn cancel" data-action="cancel">' + cancelText + '</button>' +
          '<button class="custom-alert-btn confirm-btn' + (danger ? ' danger' : '') + '" data-action="confirm">' + confirmText + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel"]').onclick = function() { resolve(false); overlay.remove(); };
    overlay.querySelector('[data-action="confirm"]').onclick = function() { resolve(true); overlay.remove(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { resolve(false); overlay.remove(); } });
  });
};

(function(){
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">'
    + '<rect fill="#262626" width="400" height="300" rx="8"/>'
    + '<g transform="translate(152,80)" fill="none" stroke="#666" stroke-width="1.8">'
    + '<rect x="2" y="2" width="92" height="92" rx="8" stroke-dasharray="4 3"/>'
    + '<circle cx="36" cy="32" r="10"/>'
    + '<polyline points="94,88 64,52 12,88"/>'
    + '</g>'
    + '<text fill="#999" font-family="-apple-system,PingFang SC,sans-serif" font-size="14" font-weight="500" text-anchor="middle" x="200" y="225">图片加载失败</text>'
    + '</svg>';
  window.IMG_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(svg);
  window.setImgFallback = function(img) {
    if (!img || img.dataset.fallbacked) return;
    img.dataset.fallbacked = '1';
    img.onerror = null;
    img.src = IMG_FALLBACK;
    img.classList.add('img-fallback');
  };
})();
