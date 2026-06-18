# Changelog

## 2026-06-19

### 文档结构拆分
- **README 轻量化**：将大段公网访问与 API 接口内容从 README 中拆出，README 仅保留入口链接，便于作为项目总览维护
- **新增 `docs/` 文档目录**：集中管理专题文档，减少 README 内容膨胀
- **新增 `docs/tunneling.md`**：独立维护内网穿透与公网访问方案
- **新增 `docs/api.md`**：独立维护后端 API 接口说明

### 内网穿透与公网访问文档
- **Cloudflare Tunnel 固定域名方案**：补充 Named Tunnel 工作方式，说明 `https://wpape.top -> http://localhost:3000` 的转发关系
- **cloudflared 安装与服务管理**：新增 macOS/Homebrew 安装、系统服务注册、重启、状态查看、日志查看、卸载流程
- **关键命令说明**：
  - `brew install cloudflared`：安装 `cloudflared` 程序本体
  - `sudo cloudflared service install <你的 tunnel token>`：注册 Tunnel 为 macOS 系统级 LaunchDaemon
  - `sudo launchctl kickstart -k system/com.cloudflare.cloudflared`：强制重启已有 cloudflared 系统服务
  - `sudo launchctl print system/com.cloudflare.cloudflared`：查看系统服务状态
  - `tail -f /Library/Logs/com.cloudflare.cloudflared.err.log`：查看 cloudflared 错误日志
  - `sudo cloudflared service uninstall`：卸载系统级 cloudflared 服务
- **常见问题补充**：记录重复安装 `cloudflared service is already installed`、未使用 `sudo` 卸载导致查找 `LaunchAgents` 失败、Cloudflare `530`、DNS `no such host` 等排查方式
- **网络环境说明**：补充公司网络、加域设备策略、代理或路由器 DNS 劫持可能导致 Tunnel 无法连接 Cloudflare 的说明
- **长期部署建议**：新增 VPS + Cloudflare Tunnel 方案，说明本机部署会受电脑睡眠、关机、断网、Node 进程退出影响

### API 文档拆分
- **新增 API 独立文档**：将认证、用户资料、反馈、图片、评论、导入、审批、删除接口移动到 `docs/api.md`
- **错误码说明迁移**：将 `400`、`401`、`409`、`500` 等错误码说明迁移到 API 文档
- **标题层级整理**：调整 `docs/api.md` 标题结构，使其作为独立 Markdown 文档更清晰

### SQLite 故障排查
- **新增 SQLite 只读故障说明**：README 中补充 `SQLITE_READONLY` / `attempt to write a readonly database` 的识别方式
- **补充权限检查命令**：记录 `ls -l users.db users.db-shm users.db-wal` 检查 SQLite 主库与 WAL 辅助文件权限
- **补充修复命令**：记录 `chmod u+w users.db users.db-shm users.db-wal` 恢复当前用户写权限
- **补充验证方式**：记录 `node server.js` 与 `curl -I http://localhost:3000` 验证本地服务恢复

### 本地联调记录
- **确认本地服务端口**：本地 Node 服务默认监听 `localhost:3000`
- **确认局域网访问地址**：本机 Wi-Fi 局域网 IP 为 `192.168.1.101`，同网设备可访问 `http://192.168.1.101:3000`
- **确认 Cloudflare Tunnel 当前阻塞点**：本地服务可正常返回 `200 OK`，公网 `530` 主要由 cloudflared 无法连通 Cloudflare 边缘节点引起，优先排查 DNS/网络环境

## 2026-06-17

### 全屏缩放查看器
- **新增全屏图片缩放预览**：preview.html 新增 `.zoom-overlay` 黑色全屏层（z-index 9999，淡入动画），包含 `.zoom-image-wrap` 容器 + `.zoom-image` 缩放图片 + `.zoom-close` 毛玻璃关闭按钮 + `.zoom-indicator` 百分比指示器
- **缩放与拖拽**：preview-page.js 新增 ~340 行全屏查看器逻辑 —— 触摸捏合（双指缩放，以中心点锚定）、单指拖拽平移、双击 3x 放大/还原（以点击位置为中心）、鼠标滚轮缩放（Ctrl+滚轮）、ESC 关闭
- **边界限制**：`clampTranslation()` 禁止图片边缘进入视口内部，displayH 基于宽高比反推（规避 flex stretch 拉伸 offsetHeight），Y 轴扣除父容器 flex 居中隐式偏移防止误放
- **单击/双击互斥**：touchend 300ms 双击窗口 + setTimeout 250ms 单击关闭，preventDefault 阻止后续 click 干扰
- **回弹动画**：缩小至 scale < 0.8 松开后自动回弹到 scale=1 + translate(0,0)，CSS transition 平滑过渡
- **状态指示器**：放大时左下角显示百分比（如 "300%"），缩小至基准时自动隐藏

### iOS 滚动兼容（全页面统一修复）
- **根因**：iOS Safari 中滚动容器内的图片因合成层边界导致渲染异常，需 `-webkit-overflow-scrolling: touch` + `transform: translateZ(0)` 创建独立合成层
- **统一修复 8 个滚动容器**：
  - `style.css` - `.home-content-area`（同时移除 `overscroll-behavior-y: contain`）
  - `upload.html` - `.upload-page`
  - `admin.html` - `.admin-page`
  - `login.html` - `.auth-page`
  - `feedback.html` - `.feedback-page`
  - `my-images.html` - `.my-page`
  - `profile.html` - `.profile-page`
  - `preview.html` - `.comment-panel`

### 卡片 UI 优化
- **点赞按钮布局重构**：`.card-like-btn` 从绝对定位（bottom/right）改为 flex 子元素，新增 `.card-info-row` 容器（flex + space-between），与发布者信息水平并排一行
- **卡片元数据对比度提升**：`.card-meta` 颜色从 `#666` 改为 `#999`，提升暗色背景可读性
- `.card-publisher` 移除 `margin-bottom: 6px`（现在由 `.card-meta` 的 `margin-top: 6px` 统一控制间距）

### 上传接口修复
- **修复 `uploaderName` 未定义**：`POST /api/images/upload` 路由中从 `users` 表查询上传者的 `username` 和 `avatar`，传入 INSERT 语句，修复此前上传时 uploader_name 为空的问题

### 图片路径规范化
- **新增 `normalizeImagePath()` 函数**（routes/images.js）：将绝对路径（如 `/Users/.../uploads/xxx.jpg`）统一转换为 URL 路径（`/uploads/xxx.jpg`），保留已有完整 URL 和 `/uploads/` 前缀路径
- **应用到所有图片接口**：`GET /api/images`（列表 + group 展开）、`GET /api/images/:id`（详情），thumbnail_path 和 hd_path 统一走规范化
- **缩略图缺失兜底**：列表接口中若 thumbnail 文件不存在，自动用 hd_path 替代，避免空白

### 图片展示修复
- **懒加载空 src 防护**：`app.js` `ensureLazyObserver()` 中，`thumbnail_path` 为空时跳过 `img.src` 设置（避免浏览器请求当前页面 URL → onerror → fallback 变暗），直接走 fallback SVG
- **路径规范化前置**：`app.js` `renderGallery()` 中 `thumbSrc` 直接使用 `thumbnail_path` 原值，不再自行做正则路径替换（后端已统一规范化）
- **Fallback SVG 对比度优化**（fallback.js）：背景从 `#262626` 改为 `#2a2a2a`，新增 `#444` 描边边框，图标描边从 `#666` 改为 `#777`，文字从 `#999` 改为 `#aaa`

### iOS 保存图片（JSBridge）
- **多桥接兼容**：preview-page.js 保存按钮逻辑重写，iOS 端支持 4 种 JSBridge 通道：① `WKWebView.messageHandlers.saveImageToAlbum` ② `saveImage` 别名 ③ 通用 `JSBridge.call` ④ `WebViewJavascriptBridge.callHandler`
- **Android 独立分支**：新增 Android 端保存逻辑，支持 `JSBridge.call` / `Android.saveImageToAlbum`，无桥接时回退为 `<a download>`
- **无桥接回退优化**：iOS 无桥接场景的 `document.write` 回退页提示文案改为"请长按图片保存"

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
