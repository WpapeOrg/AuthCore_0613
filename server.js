const app = require('./app');
const { PORT } = require('./config');

app.listen(PORT, () => {
  console.log(`\n服务器已启动！`);
  console.log(`   本地地址: http://localhost:${PORT}`);
  console.log(`   API 文档:`);
  console.log(`     POST /api/register     → 注册`);
  console.log(`     POST /api/login        → 登录`);
  console.log(`     GET  /api/me           → 当前用户信息 (需 Token)`);
  console.log(`     GET  /api/users        → 所有用户列表`);
  console.log(`     GET  /api/categories   → 分类列表`);
  console.log(`     GET  /api/images       → 图片列表（分页）`);
  console.log(`     GET  /api/images/:id   → 图片详情 (需 Token)`);
  console.log(`     POST /api/images/upload → 上传图片 (需 Token)\n`);
});
