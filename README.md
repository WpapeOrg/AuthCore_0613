# AuthCore

一个基于 **Node.js + Express + SQLite** 的轻量级用户登录注册系统，支持 JWT 身份验证。

---

## 项目结构

```
AuthCore_0613/
├── server.js              # 入口文件（启动服务器）
├── app.js                 # Express 应用配置与中间件挂载
├── config/
│   └── index.js           # 配置常量（端口、JWT 密钥、Token 生成）
├── db/
│   └── index.js           # 数据库初始化与连接（better-sqlite3）
├── middleware/
│   └── auth.js            # JWT 认证中间件
├── routes/
│   ├── auth.js            # 认证相关路由（注册、登录、用户信息）
│   └── images.js          # 图片相关路由（列表、详情、点赞、评论、导入、路径规范化）
├── public/
│   ├── index.html         # 首页（图片流）
│   ├── login.html         # 登录页
│   ├── preview.html       # 图片预览页
│   ├── upload.html        # 上传页
│   ├── import.html        # 批量导入页
│   ├── profile.html       # 个人资料页
│   ├── admin.html         # 管理后台
│   ├── my-images.html     # 我的图片
│   ├── css/
│   │   └── style.css      # 全局样式
│   └── js/
│       ├── app.js         # 首页逻辑（含下拉刷新）
│       ├── preview-page.js # 预览页逻辑
│       ├── import-page.js # 导入页逻辑
│       └── ...            # 其他页面脚本
├── feedback.html           # 用户反馈页（五星评分）
├── tools/
│   ├── picb_scraper.js    # picb.cc 爬虫脚本
│   └── import.json        # 导入数据样例
├── ios-app/               # iOS 原生壳 App（WKWebView）
│   ├── AuthCore.xcodeproj/
│   └── AuthCore/
│       ├── AuthCoreApp.swift
│       ├── ContentView.swift
│       ├── Info.plist
│       └── Assets.xcassets/
├── package.json           # 项目依赖配置
└── users.db               # SQLite 数据库（首次启动后自动生成）
```

---

## 安装依赖

确保本地已安装 [Node.js](https://nodejs.org/)（建议 v16 及以上），然后执行：

```bash
npm install
```

安装的依赖包括：

| 包名 | 用途 |
|------|------|
| `express` | Web 服务器框架 |
| `better-sqlite3` | SQLite 数据库驱动 |
| `bcryptjs` | 密码加密 |
| `jsonwebtoken` | JWT Token 生成与验证 |
| `cors` | 跨域请求支持 |

---

## 启动方法

**生产模式**
```bash
node server.js
```

**开发模式**（文件修改后自动重启）
```bash
npm run dev
```

启动成功后终端会显示：
```
✅ 服务器已启动！
   本地地址: http://localhost:3000
```

### SQLite 只读故障处理

如果启动时看到类似下面的错误，说明 SQLite 数据库文件或 WAL 辅助文件被系统标记成只读：

```text
SqliteError: attempt to write a readonly database
code: 'SQLITE_READONLY'
```

先检查数据库文件权限：

```bash
cd /Users/XXX/JDProject/AuthCore_0613
ls -l users.db users.db-shm users.db-wal
```

如果看到 `r--r--r--`，说明当前用户没有写权限。执行下面命令恢复可写：

```bash
chmod u+w users.db users.db-shm users.db-wal
```

再次检查时应看到 `rw-r--r--`：

```bash
ls -l users.db users.db-shm users.db-wal
```

最后重新启动服务并验证：

```bash
node server.js
curl -I http://localhost:3000
```

`curl` 返回 `HTTP/1.1 200 OK` 即表示本地服务已经恢复。

---

## 访问方法

| 地址 | 说明 |
|------|------|
| `http://localhost:3000` | 前端登录 / 注册页面 |
| `http://localhost:3000/api/...` | 后端 API 接口 |

---

## 公网访问

内网穿透和公网访问方案已拆分到独立文档维护：

- [内网穿透与公网访问](docs/tunneling.md)

当前文档包含 Cloudflare Tunnel、ngrok、serveo.net、VPS 长期部署方案，以及安装、卸载、重启、查看日志和常见问题排查。

---

## API 接口说明

API 文档已拆分到独立文档维护：

- [API 接口说明](docs/api.md)

当前文档包含认证、用户资料、反馈、图片、评论、导入、审批、删除接口，以及错误码说明。

---

## iOS 兼容性

### 滚动容器合成层修复

iOS Safari 中，滚动容器内的图片可能因合成层边界引发渲染异常（图片截断、闪烁、拖影）。解决方案是对所有 `overflow-y: auto` / `overflow: auto` 的滚动容器统一添加：

```css
-webkit-overflow-scrolling: touch;
transform: translateZ(0);
```

`translateZ(0)` 将容器提升为独立合成层，`-webkit-overflow-scrolling: touch` 启用原生惯性滚动。已覆盖全部 8 个滚动容器（`.home-content-area`、`.upload-page`、`.admin-page`、`.auth-page`、`.feedback-page`、`.my-page`、`.profile-page`、`.comment-panel`）。

### 全屏缩放查看器

preview.html 内置全屏图片缩放查看器，点击轮播图片即可进入：

- **触摸操作**：双指捏合缩放（0.5x ~ 3x，以中心点锚定）、单指拖拽平移、双击 3x 放大/还原
- **边界保护**：图片边缘禁止拖入视口内部产生空白，Y 轴自动扣除 flex 居中偏移
- **回弹**：缩小至 0.8x 以下松开自动回弹至原始大小
- **PC 兼容**：Ctrl + 滚轮缩放、ESC 关闭

### JSBridge 保存图片

preview.html 保存按钮兼容 4 种 iOS JSBridge 通道（`WKWebView.messageHandlers.saveImageToAlbum` / `saveImage` / `JSBridge.call` / `WebViewJavascriptBridge`），以及 Android 的 `JSBridge.call` / `Android.saveImageToAlbum`。无桥接环境回退为全屏图片页引导长按保存。

### 图片路径规范化

`routes/images.js` 中 `normalizeImagePath()` 函数将数据库存储的绝对路径统一转为 URL 路径（`/uploads/xxx.jpg`），前端不再需要自行做路径正则替换。所有图片接口（列表、详情、group 展开）已统一接入。

## 注意事项

- JWT Secret 默认为 `your_secret_key_change_this_in_production`，**上线前请务必修改**。
- `users.db` 文件会在首次运行时自动创建，无需手动创建数据库。
- Token 有效期为 **7 天**，过期需重新登录。
- 查询本地端口是否开启 `lsof -i :3000`
- 强制关闭node端口 `kill -9 42619`

---

## iOS App 打包

项目包含一个 iOS 原生壳 App，通过 WKWebView 加载本地服务器页面。

### 前置条件
- macOS + Xcode 15+
- 有效的 Apple Developer 账号（免费账号即可）
- iPhone 与 Mac 在同一局域网

### 打包步骤
1. 启动 Node.js 服务器：`node server.js`
2. 确认 Mac 局域网 IP（默认硬编码 `192.168.1.102:3000`，可在 `ios-app/AuthCore/ContentView.swift` 中修改 `serverURL()`）
3. 用 Xcode 打开 `ios-app/AuthCore.xcodeproj`
4. 选择你的 iPhone 作为运行目标
5. Signing & Capabilities → Team 选择你的 Apple ID
6. `Cmd+R` 编译并安装到手机

### 项目结构
```
ios-app/
├── AuthCore.xcodeproj/        # Xcode 工程
└── AuthCore/
    ├── AuthCoreApp.swift       # SwiftUI App 入口
    ├── ContentView.swift       # WKWebView + 沉浸式全屏
    ├── Info.plist              # 本地网络权限 & 状态栏配置
    └── Assets.xcassets/        # App 图标
```
