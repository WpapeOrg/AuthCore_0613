const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const crypto = require("crypto");
const db = require("../db");
const {
  authMiddleware,
  optionalAuth,
  adminMiddleware,
} = require("../middleware/auth");

const router = express.Router();

// ── multer 配置 ───────────────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(uploadDir, "originals")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "_" + crypto.randomBytes(4).toString("hex") + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|bmp/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, valid);
  },
});

// ── 分类列表 ──────────────────────────────────────────
router.get("/categories", (req, res) => {
  const cats = db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
  res.json(cats);
});

// ── 图片列表（分页 + 排序）───────────────────────────
router.get("/images", optionalAuth, (req, res) => {
  const {
    sort = "newest",
    page = 1,
    limit = 30,
    group_id,
    category_id,
  } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // group_id 查询：获取同组所有图片（用于预览轮播）
  if (group_id) {
    const images = db
      .prepare(
        "SELECT * FROM images WHERE group_id = ? ORDER BY created_at ASC",
      )
      .all(group_id);
    return res.json(images);
  }

  // 管理员可见所有状态；普通用户仅见 approved
  let statusFilter;
  if (req.user) {
    const user = db
      .prepare("SELECT role, age FROM users WHERE id = ?")
      .get(req.user.id);
    statusFilter =
      user && user.role === "admin" ? "1=1" : "status = 'approved'";
  } else {
    statusFilter = "status = 'approved'";
  }

  let categoryFilter = "";
  const params = [];
  if (category_id) {
    categoryFilter = "AND i.category_id = ?";
    params.push(category_id);
  }

  // 18+ 内容过滤：非登录用户或年龄 <= 18 的用户默认排除 18+ 分类
  let adultFilter = "";
  const adultCat = db
    .prepare("SELECT id FROM categories WHERE icon = ?")
    .get("adult");
  if (adultCat) {
    let showAdult = false;
    if (req.user && !category_id) {
      const userRow = db
        .prepare("SELECT age FROM users WHERE id = ?")
        .get(req.user.id);
      if (userRow && userRow.age !== null && userRow.age > 18) {
        showAdult = true;
      }
    }
    // 如果用户直接指定了 18+ 分类，且有权限查看，才不过滤
    if (category_id && parseInt(category_id) === adultCat.id) {
      let authorized = false;
      if (req.user) {
        const userRow = db
          .prepare("SELECT age FROM users WHERE id = ?")
          .get(req.user.id);
        if (userRow && userRow.age !== null && userRow.age > 18) {
          authorized = true;
        }
      }
      if (!authorized) {
        return res.json({ images: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
      }
    }
    if (!showAdult && !category_id) {
      adultFilter = "AND i.category_id != " + adultCat.id;
    }
  }

  const orderMap = {
    newest: "i.created_at DESC",
    hottest: "i.views DESC",
    most_liked: "i.likes DESC",
  };
  const orderBy = orderMap[sort] || "i.created_at DESC";

  // 统计总数查询不使用表别名，去掉可能的 `i.` 前缀
  const totalCategoryFilter = categoryFilter
    ? categoryFilter.replace(/i\./g, "")
    : "";
  const totalAdultFilter = adultFilter ? adultFilter.replace(/i\./g, "") : "";

  // 同组多图只取首张（group_id 非空取组内最小 id；单张图 group_id 为空时取自身）
  const imagesSql = `
    SELECT i.*, c.name as category_name,
      (SELECT COUNT(*) FROM images WHERE group_id = i.group_id AND group_id != '') as group_count,
      u.username as uploader_name, u.avatar as uploader_avatar
    FROM images i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN users u ON i.uploader_id = u.id
    INNER JOIN (
      SELECT MIN(id) as min_id
      FROM images
      WHERE ${statusFilter} ${totalCategoryFilter} ${totalAdultFilter}
      GROUP BY CASE WHEN group_id = '' THEN CAST(id AS TEXT) ELSE group_id END
    ) g ON i.id = g.min_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const images = db.prepare(imagesSql).all(...params, parseInt(limit), offset);

  const total = db
    .prepare(
      `SELECT COUNT(*) as count FROM (SELECT 1 FROM images WHERE ${statusFilter} ${totalCategoryFilter} ${totalAdultFilter} GROUP BY CASE WHEN group_id = '' THEN CAST(id AS TEXT) ELSE group_id END)`,
    )
    .get(...params);

  res.json({
    images,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// ── 待审批列表（需管理员）────────────────────────────
router.get("/images/pending", adminMiddleware, (req, res) => {
  const images = db
    .prepare(
      `
    SELECT i.*, c.name as category_name, u.username as uploader_name
    FROM images i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN users u ON i.uploader_id = u.id
    WHERE i.status = 'pending'
    ORDER BY i.created_at DESC
  `,
    )
    .all();
  res.json(images);
});

// ── 图片详情（可选认证）──────────────────────────────
router.get("/images/:id", optionalAuth, (req, res) => {
  const image = db
    .prepare(
      `
    SELECT i.*, c.name as category_name
    FROM images i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.id = ?
  `,
    )
    .get(req.params.id);

  if (!image) return res.status(404).json({ error: "图片不存在" });

  // 容错：thumbnail/hd 互相补充
  if (!image.thumbnail_path || !fs.existsSync(image.thumbnail_path)) {
    if (image.hd_path && fs.existsSync(image.hd_path))
      image.thumbnail_path = image.hd_path;
  }
  if (!image.hd_path || !fs.existsSync(image.hd_path)) {
    if (image.thumbnail_path && fs.existsSync(image.thumbnail_path))
      image.hd_path = image.thumbnail_path;
  }

  // 浏览量 +1
  db.prepare("UPDATE images SET views = views + 1 WHERE id = ?").run(image.id);
  image.views += 1;

  // 当前用户是否已点赞
  let liked = false;
  if (req.user) {
    const like = db
      .prepare("SELECT id FROM image_likes WHERE image_id = ? AND user_id = ?")
      .get(image.id, req.user.id);
    liked = !!like;
  }
  image.liked = liked;

  res.json(image);
});

// ── 批量上传（需登录，最多20张）──────────────────────
router.post(
  "/images/upload",
  authMiddleware,
  upload.array("images", 20),
  async (req, res) => {
    try {
      const { title, category_id, tags } = req.body;
      const files = req.files;

      if (!files || files.length === 0)
        return res.status(400).json({ error: "请选择图片" });
      if (!category_id) return res.status(400).json({ error: "请选择分类" });

      const groupId =
        "g_" + Date.now() + "_" + crypto.randomBytes(6).toString("hex");

      const insertStmt = db.prepare(`
      INSERT INTO images (title, category_id, thumbnail_path, hd_path, width, height, tags, uploader_id, uploader_name, uploader_avatar, group_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

      const results = [];

      for (const file of files) {
        const thumbFilename = "thumb_" + path.basename(file.filename);
        const thumbPath = path.join(uploadDir, "thumbnails", thumbFilename);

        let width = 0,
          height = 0;
        try {
          const metadata = await sharp(file.path).metadata();
          width = metadata.width || 0;
          height = metadata.height || 0;

          await sharp(file.path)
            .resize(400, 400, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(thumbPath);
        } catch (err) {
          console.error("缩略图生成失败:", err.message);
          // 降级：直接复制原图作为缩略图
          fs.copyFileSync(file.path, thumbPath);
        }

        // 无标题时生成随机6位字符串
        function randomTitle() {
          const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          let s = "";
          for (let i = 0; i < 6; i++)
            s += chars.charAt(Math.floor(Math.random() * chars.length));
          return s;
        }
        const finalTitle = title || randomTitle();

        const result = insertStmt.run(
          finalTitle,
          parseInt(category_id),
          thumbPath,
          file.path,
          width,
          height,
          tags || "",
          req.user.id,
          uploaderName,
          uploaderAvatar,
          groupId,
        );

        results.push({ id: result.lastInsertRowid, title: finalTitle });
      }

      res.status(201).json({
        message: `成功上传 ${results.length} 张图片，等待审核`,
        group_id: groupId,
        images: results,
      });
    } catch (err) {
      console.error("上传错误:", err);
      res.status(500).json({ error: "上传失败" });
    }
  },
);

// ── 审批通过（需管理员）──────────────────────────────
router.put("/images/:id/approve", adminMiddleware, (req, res) => {
  const image = db
    .prepare("SELECT id FROM images WHERE id = ?")
    .get(req.params.id);
  if (!image) return res.status(404).json({ error: "图片不存在" });
  db.prepare("UPDATE images SET status = 'approved' WHERE id = ?").run(
    image.id,
  );
  res.json({ message: "已通过审批" });
});

// ── 审批拒绝（需管理员）──────────────────────────────
router.put("/images/:id/reject", adminMiddleware, (req, res) => {
  const image = db
    .prepare("SELECT id FROM images WHERE id = ?")
    .get(req.params.id);
  if (!image) return res.status(404).json({ error: "图片不存在" });
  db.prepare("UPDATE images SET status = 'rejected' WHERE id = ?").run(
    image.id,
  );
  res.json({ message: "已拒绝" });
});

// ── 点赞 ──────────────────────────────────────────────
router.post("/images/:id/like", authMiddleware, (req, res) => {
  const imageId = req.params.id;
  const userId = req.user.id;
  const image = db.prepare("SELECT id FROM images WHERE id = ?").get(imageId);
  if (!image) return res.status(404).json({ error: "图片不存在" });

  const existing = db
    .prepare("SELECT id FROM image_likes WHERE image_id = ? AND user_id = ?")
    .get(imageId, userId);
  if (existing) return res.status(400).json({ error: "已经点过赞了" });

  db.transaction(() => {
    db.prepare("INSERT INTO image_likes (image_id, user_id) VALUES (?, ?)").run(
      imageId,
      userId,
    );
    db.prepare("UPDATE images SET likes = likes + 1 WHERE id = ?").run(imageId);
  })();

  const likes = db
    .prepare("SELECT likes FROM images WHERE id = ?")
    .get(imageId);
  res.json({ message: "点赞成功", likes: likes.likes });
});

// ── 取消点赞 ──────────────────────────────────────────
router.delete("/images/:id/like", authMiddleware, (req, res) => {
  const imageId = req.params.id;
  const userId = req.user.id;
  const existing = db
    .prepare("SELECT id FROM image_likes WHERE image_id = ? AND user_id = ?")
    .get(imageId, userId);
  if (!existing) return res.status(400).json({ error: "尚未点赞" });

  db.transaction(() => {
    db.prepare(
      "DELETE FROM image_likes WHERE image_id = ? AND user_id = ?",
    ).run(imageId, userId);
    db.prepare("UPDATE images SET likes = MAX(0, likes - 1) WHERE id = ?").run(
      imageId,
    );
  })();

  const likes = db
    .prepare("SELECT likes FROM images WHERE id = ?")
    .get(imageId);
  res.json({ message: "已取消点赞", likes: likes.likes });
});

// ── 评论列表 ──────────────────────────────────────────
router.get("/images/:id/comments", (req, res) => {
  const comments = db
    .prepare(
      "SELECT * FROM comments WHERE image_id = ? ORDER BY created_at ASC",
    )
    .all(req.params.id);
  res.json(comments);
});

// ── 发表评论（需登录）────────────────────────────────
router.post("/images/:id/comments", authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "评论内容不能为空" });

  const user = db
    .prepare("SELECT username FROM users WHERE id = ?")
    .get(req.user.id);
  const result = db
    .prepare(
      "INSERT INTO comments (image_id, user_id, username, content) VALUES (?, ?, ?, ?)",
    )
    .run(req.params.id, req.user.id, user.username, content);

  res.status(201).json({ id: result.lastInsertRowid, message: "评论成功" });
});

// ── 批量导入（需登录 + admin）─────────────────────────
router.post("/images/import", adminMiddleware, (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "请提供有效的 images 数组" });
    }

    const insertStmt = db.prepare(`
      INSERT INTO images (title, category_id, thumbnail_path, hd_path, width, height, uploader_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')
    `);

    const result = { success: 0, failed: 0, errors: [] };

    const insertMany = db.transaction((items) => {
      for (const img of items) {
        try {
          const title = img.title || "untitled";
          const categoryId = parseInt(img.category_id) || 49;
          const thumbnailPath = img.thumbnail_path || "";
          const hdPath = img.hd_path || "";
          const width = parseInt(img.width) || 0;
          const height = parseInt(img.height) || 0;

          if (!hdPath) {
            result.failed++;
            result.errors.push({ title, reason: "缺少 hd_path" });
            continue;
          }

          insertStmt.run(title, categoryId, thumbnailPath, hdPath, width, height, req.user.id);
          result.success++;
        } catch (err) {
          result.failed++;
          result.errors.push({ title: img.title || "unknown", reason: err.message });
        }
      }
    });

    insertMany(images);

    res.json({
      message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
      ...result,
    });
  } catch (err) {
    console.error("批量导入错误:", err);
    res.status(500).json({ error: "导入失败: " + err.message });
  }
});

// ── 下架图片（上传者本人，清理评论/点赞/文件/记录）──
router.delete("/images/:id", authMiddleware, (req, res) => {
  const image = db
    .prepare("SELECT * FROM images WHERE id = ?")
    .get(req.params.id);
  if (!image) return res.status(404).json({ error: "图片不存在" });

  // 检查权限：只有上传者本人可以下架
  if (image.uploader_id !== req.user.id) {
    return res.status(403).json({ error: "无权操作该图片" });
  }

  db.transaction(() => {
    db.prepare("DELETE FROM image_likes WHERE image_id = ?").run(image.id);
    db.prepare("DELETE FROM comments WHERE image_id = ?").run(image.id);
    db.prepare("DELETE FROM images WHERE id = ?").run(image.id);
  })();

  [image.thumbnail_path, image.hd_path].forEach((p) => {
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {}
    }
  });

  res.json({ message: "图片已下架" });
});

module.exports = router;
