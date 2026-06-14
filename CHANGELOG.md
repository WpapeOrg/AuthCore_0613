# Changelog

## 2026-06-14

### Titlebar 组件重构
- titlebar 重新设计为 iOS 风格：CSS 纯箭头（`::before` 伪元素）替代文字 `←`
- 底部分割线改用 `::after` 0.5px 细线
- 新增 `.titlebar-btn`、`.titlebar-link`、`.titlebar-checkbox` 独立样式类
- titlebar 定位从 `sticky` 改为 `fixed`，z-index 提升至 1000
- 全部 7 个页面（my-images / admin / profile / login / preview / upload / feedback）统一接入
- 所有页面内容区改为独立滚动容器，防止穿透 titlebar

### 页面布局修复
- 个人资料页：移除 `<h2>`，保存按钮移入 titlebar-right
- 登录/注册页：浅色主题重构，表单卡片居中，titlebar 正确接入
- admin 审批页：卡片 title 与 meta 水平并排一行
- admin 审批页 meta-row 第一项改为显示图片分类

### 移动端适配
- 所有 input `font-size` 设为 16px 防止 iOS 自动缩放
- viewport meta 增加 `maximum-scale=1.0, user-scalable=no`
- 全局 `confirm()` 替换为自定义 iOS 风格弹窗（`showConfirm`，毛玻璃 + 缩放动画）
- 圆形 checkbox 样式，对勾精确居中

### 接口修复
- 补全 `POST /api/upload-avatar` 路由处理器

### 其他修复
- 退出登录后首页 tab 栏样式更新
- admin 审批页滚动失效修复

### UI 重构与修复
- **安全区全面回滚**: 回滚 9 个文件共 11 处 safe-area CSS 改动，ContentView.swift 保留 `.automatic` contentInsetAdjustmentBehavior
- **Tab 美化**: 选中态改为底部紫色下划线指示器，删除 GeometryReader / 自定义 contentInset / WKUserScript 等复杂方案
- **iOS 手势返回**: ContentView.swift 添加 `allowsBackForwardNavigationGestures`
- **预览页保存按钮**: preview.html 添加保存按钮（PC端右下、手机端右上），preview-page.js 添加下载逻辑；后续改造为 WKWebView 原生保存到相册，非 WKWebView 环境回退为 `document.write` 黑色全屏居中图片页 + "请长按保存"提示
- **滚动管理**: 滚动移到 `.home-content-area` 元素，修复 carousel-dots 遮挡，禁用全局滚动仅 content-area 内部滚动，恢复 iOS 橡皮筋效果
- **修复回到顶部按钮**: scrollToTop 目标改为 `.home-content-area` 而非 `window`
- **返回首页不刷新**: 返回按钮改为 `history.back()`，pageshow 监听中清空 hash，bfcache 恢复时不触发 API
- **修复 innerHeight 布局上移**: 4 处 `100vh` 改为 `100dvh`（保留 100vh 回退）；URLRequest 缓存策略改为 `.useProtocolCachePolicy`；server.js 添加 HTML `no-cache` 头
- **调试面板**: 三击用户头像切换面板显隐（替代摇一摇），index.html 内联诊断脚本，`app.js` init() 后设 `window.__isAdmin`

### iOS App
- 创建 iOS 原生壳 App（`ios-app/`），通过 WKWebView 加载本地服务
- 支持沉浸式全屏，原生 safeAreaInsets 适配刘海屏和 Home Indicator
- 配置本地网络权限（`NSAllowsLocalNetworking`）、暗色状态栏
- 自动签名：`DEVELOPMENT_TEAM = 7UPX45W6C7`, `SDKROOT = iphoneos`

### 交互优化
- 全项目 `alert()` 替换为 `showToast()` 居中浮动提示（17+ 处）
- 覆盖文件：`admin-page.js`、`my-images-page.js`、`preview-page.js`、`upload-page.js`
- 对应 HTML 注入 `.toast` CSS 样式

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
- **项目根目录扁平化**: 移除 `auth-server/` 子目录，所有文件提升到 `AuthCore_0613/` 根目录，`node server.js` 直接在根目录启动，Git 历史保留
- **移除 bottom-bar**: 去掉移动端底部导航栏，优化移动端全屏体验
- **picb_scraper 优化**: 移除末尾 `window.scrollTo(0,0)`，使多次运行从当前位置继续而非从头开始
- **数据清理**: 删除 images 表 id≥17 的旧数据，重新导入后分类统一设为 141（18+）

### 反馈系统
- 新增 POST /api/feedback 路由（authMiddleware 鉴权，1-5 评分校验，写入 feedbacks 表）
- 重写 feedback.html：iOS 浅色风格，白色圆角卡片布局
- 五星评分：SVG 双态（空心/金色填充），弹性缩放动画，5 级中文标签
- 低评分（<3 星）自动展开文本框，聚焦边框紫色高亮
- 提交成功对勾 stroke 动画 + 弹性缩放卡片，1.8s 后自动返回

### 审批系统
- 新增 POST /api/images/approve-batch 批量审批路由（adminMiddleware，事务批量更新）

### 首页优化
- 新增下拉刷新功能：`.home-content-area` 触摸下拉，三态指示器（下拉刷新 / 松开刷新 / 加载中 spinner）
- 头像支持真实图片：已登录且有 avatar URL 时渲染 `<img>`，否则保留默认首字母图标
- 反馈入口从 navbar-right 迁移至 fab-container（`fab-feedback` 按钮，毛玻璃风格）

### 移动端交互修复
- 全局 `confirm()` 替换为自定义 iOS 风格弹窗（`showConfirm`，毛玻璃 + 缩放动画）
- 圆形 checkbox 对勾精确居中修复（`:checked::after` 使用 translate 定位）
