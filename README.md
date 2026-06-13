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
│   └── images.js          # 图片相关路由（列表、详情、点赞、评论、导入）
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
│       ├── app.js         # 首页逻辑
│       ├── preview-page.js # 预览页逻辑
│       ├── import-page.js # 导入页逻辑
│       └── ...            # 其他页面脚本
├── tools/
│   ├── picb_scraper.js    # picb.cc 爬虫脚本
│   └── import.json        # 导入数据样例
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

---

## 访问方法

| 地址 | 说明 |
|------|------|
| `http://localhost:3000` | 前端登录 / 注册页面 |
| `http://localhost:3000/api/...` | 后端 API 接口 |

---

## 公网访问

以下两种方式均可将本地 3000 端口暴露到公网，方便远程测试或演示。

### 方式一：ngrok（推荐）

ngrok 提供稳定的公网隧道，支持自定义子域名、请求面板查看、HTTPS 证书等。

**1. 安装**

```bash
brew install ngrok
```

**2. 注册账号并获取 authtoken**

- 访问 [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) 注册免费账户
- 登录后在 Dashboard 首页复制你的 authtoken

**3. 认证**

```bash
ngrok config add-authtoken <你的token>
```

**4. 暴露端口**

```bash
ngrok http 3000
```

启动后终端会显示公网地址，例如：

```
Forwarding  https://xxxx.ngrok-free.app -> http://localhost:3000
```

此时通过 `https://xxxx.ngrok-free.app` 即可公网访问服务。ngrok 还会在本地启动 Web 面板（`http://127.0.0.1:4040`），可实时查看请求详情。

### 方式二：serveo.net（轻量免安装）

无需注册和安装，直接通过系统自带 SSH 即可使用。

**前提条件**

- 本地服务已在 3000 端口启动（`node server.js`）
- 系统已安装 SSH 客户端

**命令**

```bash
ssh -R 80:localhost:3000 serveo.net
```

执行后终端会输出公网地址，例如：

```
Forwarding HTTP traffic from https://xxx.serveo.net
```

> **注意**：serveo.net 为免费服务，SSH 连接断开后隧道立即失效，每次重连会分配不同的子域名。如需固定子域名，可使用 `ssh -R yourname:80:localhost:3000 serveo.net`（可能已被占用）。

---

## API 接口说明

### 认证相关

#### 注册

```
POST /api/register
```

**请求体（JSON）**

```json
{
  "username": "张三",
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

**成功响应** `201`

```json
{
  "message": "注册成功",
  "token": "<JWT Token>",
  "username": "张三"
}
```

#### 登录

```
POST /api/login
```

**请求体（JSON）**

```json
{
  "email": "zhangsan@example.com",
  "password": "123456"
}
```

**成功响应** `200`

```json
{
  "message": "登录成功",
  "token": "<JWT Token>",
  "username": "张三"
}
```

#### 获取当前用户信息

```
GET /api/me
```

**请求头（需携带 Token）**

```
Authorization: Bearer <JWT Token>
```

**成功响应** `200`

```json
{
  "id": 1,
  "username": "张三",
  "email": "zhangsan@example.com",
  "created_at": "2024-01-01 12:00:00"
}
```

#### 更新用户资料

```
PUT /api/user/profile
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

**请求体（JSON）**

```json
{
  "age": 25
}
```

**成功响应** `200`

```json
{
  "message": "资料更新成功"
}
```

---

#### 获取所有用户（调试用）

```
GET /api/users
```

> ⚠️ 此接口仅供开发调试使用，上线前请删除。

**成功响应** `200`

```json
[
  {
    "id": 1,
    "username": "张三",
    "email": "zhangsan@example.com",
    "created_at": "2024-01-01 12:00:00"
  }
]
```

---

### 图片相关

#### 获取分类列表

```
GET /api/categories
```

**成功响应** `200`

```json
[
  { "id": 49, "name": "壁纸", "icon": "wallpaper", "sort_order": 1 },
  { "id": 141, "name": "18+", "icon": "adult", "sort_order": 9 }
]
```

---

#### 获取图片列表（分页）

```
GET /api/images?sort=newest&page=1&limit=30&category_id=49
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sort` | string | `newest` | 排序：`newest` / `popular` / `most_liked` |
| `page` | int | `1` | 页码 |
| `limit` | int | `30` | 每页数量 |
| `category_id` | int | 空 | 按分类筛选 |

**请求头**（可选，影响 18+ 内容可见性）

```
Authorization: Bearer <JWT Token>
```

**成功响应** `200`

```json
{
  "images": [
    {
      "id": 1,
      "title": "示例图片",
      "hd_path": "/uploads/2024/example.jpg",
      "thumbnail_path": "/uploads/2024/example_thumb.jpg",
      "width": 1920,
      "height": 1080,
      "category_id": 49,
      "category_name": "壁纸",
      "likes": 5,
      "user_liked": true,
      "group_id": "grp_xxx",
      "group_count": 3
    }
  ],
  "total": 120,
  "page": 1,
  "totalPages": 4
}
```

---

#### 获取单张图片

```
GET /api/images/:id
```

**请求头**（可选）

```
Authorization: Bearer <JWT Token>
```

---

#### 点赞 / 取消点赞

```
POST /api/images/:id/like
```

```
DELETE /api/images/:id/like
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

---

#### 获取评论

```
GET /api/images/:id/comments
```

**成功响应** `200`

```json
[
  {
    "id": 1,
    "username": "张三",
    "content": "好看",
    "created_at": "2024-01-01 12:00:00"
  }
]
```

---

#### 发表评论

```
POST /api/images/:id/comments
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

**请求体（JSON）**

```json
{
  "content": "好看"
}
```

---

#### 批量导入图片（管理员）

```
POST /api/images/import
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

**请求体（JSON）**

```json
{
  "images": [
    {
      "title": "示例",
      "hd_path": "https://example.com/image.jpg",
      "thumbnail_path": "https://example.com/image_thumb.jpg",
      "width": 800,
      "height": 600,
      "category_id": 49
    }
  ]
}
```

**成功响应** `200`

```json
{
  "success": 10,
  "failed": 0,
  "errors": []
}
```

---

#### 审批图片（管理员）

```
PUT /api/images/:id/approve
PUT /api/images/:id/reject
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

---

#### 删除图片

```
DELETE /api/images/:id
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

---

## 错误码说明

| 状态码 | 含义 |
|--------|------|
| `400` | 请求参数缺失或不合法 |
| `401` | 未授权（Token 无效或未登录） |
| `409` | 邮箱或用户名已存在 |
| `500` | 服务器内部错误 |

---

## 注意事项

- JWT Secret 默认为 `your_secret_key_change_this_in_production`，**上线前请务必修改**。
- `users.db` 文件会在首次运行时自动创建，无需手动创建数据库。
- Token 有效期为 **7 天**，过期需重新登录。
- 查询本地端口是否开启 `lsof -i :3000`
- 强制关闭node端口 `kill -9 42619`