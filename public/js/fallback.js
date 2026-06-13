/* ============================================================
   统一图片兜底模块 — 所有页面引用此文件即可
   使用方法：
     HTML:  <img ... onerror="setImgFallback(this)">
     JS:    img.onerror = function() { setImgFallback(this); };
   修改兜底样式只需改下方 SVG，全局生效
   ============================================================ */
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
