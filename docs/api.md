# API 接口说明

本文档集中管理 AuthCore 的后端 API。默认服务地址：

```text
http://localhost:3000
```

需要登录的接口使用 JWT：

```text
Authorization: Bearer <JWT Token>
```

---

## 认证相关

### 注册

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

### 登录

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

### 获取当前用户信息

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

### 更新用户资料

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

### 获取所有用户（调试用）

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

---

### 提交反馈

```
POST /api/feedback
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

**请求体（JSON）**

```json
{
  "rating": 4,
  "content": "界面很漂亮，但加载稍慢"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rating` | int | 是 | 1-5 星评分 |
| `content` | string | 否 | 文字反馈（<3 星时建议填写） |

**成功响应** `200`

```json
{
  "message": "感谢您的反馈！"
}
```

---

## 图片相关

### 获取分类列表

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

### 获取图片列表（分页）

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

### 获取单张图片

```
GET /api/images/:id
```

**请求头**（可选）

```
Authorization: Bearer <JWT Token>
```

---

### 点赞 / 取消点赞

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

### 获取评论

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

### 发表评论

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

### 批量导入图片（管理员）

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

### 审批图片（管理员）

```
PUT /api/images/:id/approve
PUT /api/images/:id/reject
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

---

### 批量审批图片（管理员）

```
POST /api/images/approve-batch
```

**请求头**

```
Authorization: Bearer <JWT Token>
```

**请求体（JSON）**

```json
{
  "action": "approve",
  "image_ids": [1, 3, 5]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | 是 | `approve` 或 `reject` |
| `image_ids` | int[] | 是 | 待审批图片 ID 列表 |

**成功响应** `200`

```json
{
  "success": true,
  "count": 3
}
```

---

### 删除图片

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
