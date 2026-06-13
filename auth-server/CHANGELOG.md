# Changelog

## 2026-06-14

### 新增
- **picb.cc 外部图源导入**: 新增 `tools/picb_scraper.js` 浏览器控制台爬虫脚本，自动滚动抓取 picb.cc 图片并输出去重 JSON；新增 `POST /api/images/import` 批量导入接口（admin）；新增 `public/import.html` + `public/js/import-page.js` 前端粘贴导入页面，支持选择分类批量导入
- **18+ 成人内容分类**: users 表新增 `age` 字段；categories 表新增 18+ 分类（id=141）；首页默认过滤 18+ 内容（未登录或 age≤18），仅 age>18 用户可见；侧边栏根据 age 动态显示入口
- **首页图片去重**: 首页按 group_id 去重，只展示批次首张图片
- **预览页缩略图导航**: 预览页轮播圆点替换为 42x42 缩略图
- **移动端骨架屏**: 去掉旋转加载圈，首次加载直接渲染 8 个骨架屏；懒加载时骨架屏高度传递给 img 防止卡片塌陷
- **`.gitignore`**: 忽略数据库文件、上传目录、node_modules 等

### 修复
- **外部图片加载失败**: `app.js` / `preview-page.js` 中 `replace(/.*\/uploads/, "/uploads")` 误将 picb.cc 外链转为本地路径，改为仅对非外部 URL 做替换
- **翻页 API 遗漏 Authorization header**: 导致 18+ 内容翻页时不显示，已修复
- **轮播圆点被 margin-bottom 推到底部**: 改用 carousel-dots 自身 margin-bottom 替代 carousel 的 margin-bottom

### 变更
- **picb_scraper 优化**: 移除末尾 `window.scrollTo(0,0)`，使多次运行从当前位置继续而非从头开始
- **数据清理**: 删除 images 表 id≥17 的旧数据，重新导入后分类统一设为 141（18+）
