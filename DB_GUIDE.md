---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 968dc0c393bc6e2852b52f6c0f829664_6a2ada6b669b11f1a99c5254007bceed
    ReservedCode1: Pe0k1TUphtQNa2HSb9T6aXLQ+Q5uzhrOfoGP/QWLSolljgm4uxRGLikVdi7xAxkxHa8I0PMle1WpZsfFQzZl8yQupYxbNnsWQ9jETpdIUeVZCcLysG78VBC5NJaXF9kFqAU1Njg2PL4IV2Ccw0Gh1HhY6vWvP8bikP8Bw9ijbi5VsdDN4HNx46uXtuY=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 968dc0c393bc6e2852b52f6c0f829664_6a2ada6b669b11f1a99c5254007bceed
    ReservedCode2: Pe0k1TUphtQNa2HSb9T6aXLQ+Q5uzhrOfoGP/QWLSolljgm4uxRGLikVdi7xAxkxHa8I0PMle1WpZsfFQzZl8yQupYxbNnsWQ9jETpdIUeVZCcLysG78VBC5NJaXF9kFqAU1Njg2PL4IV2Ccw0Gh1HhY6vWvP8bikP8Bw9ijbi5VsdDN4HNx46uXtuY=
---

# 数据库管理指南

## 概述

| 项目 | 详情 |
|------|------|
| 数据库类型 | SQLite |
| 数据库文件 | `users.db`（项目根目录，首次启动自动生成） |
| 驱动 | better-sqlite3（同步 API，无需连接池） |
| 表数量 | 2 张 |

---

## 表结构

### users（用户主表 — 加密密码）

```sql
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | TEXT | 用户名，唯一 |
| email | TEXT | 邮箱，唯一 |
| password | TEXT | **bcrypt 加密**后的密码哈希 |
| created_at | DATETIME | 注册时间 |

### user_plain_passwords（明文密码表）

```sql
CREATE TABLE IF NOT EXISTS user_plain_passwords (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE,
    plain_password TEXT    NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 外键关联 `users.id`，一对一，唯一 |
| plain_password | TEXT | **明文**密码 |

---

## 增删改查操作

以下操作可通过 `sqlite3` 命令行直接操作数据库文件：

```bash
sqlite3 /path/to/users.db
```

### 查

**查询所有用户（不含密码）**

```sql
SELECT id, username, email, created_at FROM users;
```

**按邮箱查询单个用户**

```sql
SELECT * FROM users WHERE email = 'admin.com';
```

**联表查询明文密码（需 Admin Token 才能通过 API 调用）**

```sql
SELECT u.id, u.username, u.email, p.plain_password, u.created_at
FROM users u
LEFT JOIN user_plain_passwords p ON u.id = p.user_id;
```

**查看所有表**

```sql
.tables
```

**查看表结构**

```sql
.schema users
.schema user_plain_passwords
```

---

### 增

注册新用户应通过 API 完成，确保双表原子写入：

```
POST /api/register
Content-Type: application/json

{
  "username": "新用户",
  "email": "new@example.com",
  "password": "mypassword"
}
```

注册接口内部通过事务保证数据一致性：

```javascript
// routes/auth.js 中的核心逻辑
const hash = await bcrypt.hash(password, 10);

const insertUser = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
const insertPlain = db.prepare('INSERT INTO user_plain_passwords (user_id, plain_password) VALUES (?, ?)');

db.transaction(() => {
  const userResult = insertUser.run(username, email, hash);
  insertPlain.run(userResult.lastInsertRowid, password);
})();
```

> 不推荐直接通过 SQL INSERT 新增用户，因为需要同时写入两张表且 users 表的密码为 bcrypt 哈希。

---

### 删

删除用户需同时清理两张表的数据。通过 SQLite 命令直接操作时，需在事务中显式删除两张表：

```sql
BEGIN;
DELETE FROM user_plain_passwords WHERE user_id = 3;
DELETE FROM users WHERE id = 3;
COMMIT;
```

> **注意**：SQLite 默认不启用外键约束（`PRAGMA foreign_keys` 默认为 OFF），因此需要手动删除关联记录。删除前建议先 `SELECT` 确认目标数据。

命令行一行执行：

```bash
sqlite3 users.db "BEGIN; DELETE FROM user_plain_passwords WHERE user_id = 3; DELETE FROM users WHERE id = 3; COMMIT;"
```

---

### 改

**更新邮箱**（仅涉及 users 表）

```sql
UPDATE users SET email = 'newemail@example.com' WHERE id = 2;
```

**更新密码**（需同时更新两张表：users 表存 bcrypt 哈希，明文表存原文）

通过 API 暂未提供修改密码接口，如需直接操作数据库：

```sql
BEGIN;
UPDATE users SET password = '<bcrypt_hash>' WHERE id = 2;
UPDATE user_plain_passwords SET plain_password = 'newpassword' WHERE user_id = 2;
COMMIT;
```

> 生成 bcrypt 哈希可用 Node.js 一行脚本：
> ```bash
> node -e "const bcrypt=require('bcryptjs');bcrypt.hash('yourpassword',10).then(h=>console.log(h))"
> ```

---

## 注意事项

| 事项 | 说明 |
|------|------|
| **密码存储** | `users.password` 存储的是 bcrypt 哈希值，不可逆；明文仅存在于 `user_plain_passwords.plain_password` |
| **双表一致性** | 写入/更新密码时必须同时操作两表，建议使用事务保证原子性 |
| **外键约束** | SQLite 默认不强制执行外键，删除用户时务必手动清理 `user_plain_passwords` 表 |
| **明文表安全** | `user_plain_passwords` 存储明文密码，仅服务端可访问，API 通过 `/api/admin/passwords`（需 Admin Token）对外提供 |
| **Admin Token** | 默认值为 `admin_secret_token_change_this_in_production`，上线前务必修改 `config/index.js` 中的 `ADMIN_TOKEN` |
| **数据库备份** | 直接复制 `users.db` 文件即可完成备份，SQLite 为单文件数据库 |
*（内容由AI生成，仅供参考）*
