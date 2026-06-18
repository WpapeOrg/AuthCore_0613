# 内网穿透与公网访问

本文档集中管理 AuthCore 的公网访问方案。默认本地服务运行在：

```text
http://localhost:3000
```

启动本地服务：

```bash
node server.js
```

验证本地服务：

```bash
curl -I http://localhost:3000
```

看到 `HTTP/1.1 200 OK` 表示本地服务正常。

---

## 方案对比

| 方式 | 适合场景 | 优点 | 限制 |
|------|----------|------|------|
| Cloudflare Tunnel | 已有域名，希望固定域名访问 | 不需要公网 IP，不需要路由器端口映射，可绑定自有域名 | 本机睡眠/关机/断网会中断；公司网络可能阻断 DNS/QUIC/HTTPS |
| ngrok | 临时演示、快速公网调试 | 安装简单，有请求面板 | 免费版域名通常不固定 |
| serveo.net | 临时测试、免安装 | 只需要 SSH | 稳定性依赖免费服务，连接断开即失效 |
| VPS + Cloudflare Tunnel | 长期部署 | 稳定、低成本、电脑关机不影响 | 需要购买和维护 VPS |

---

## 方式一：Cloudflare Tunnel（固定域名 / Named Tunnel）

Cloudflare Tunnel 可以把 Cloudflare 托管的域名转发到本机服务，例如：

```text
https://wpape.top -> http://localhost:3000
```

这种方式不需要在路由器上做端口映射，也不需要暴露本机公网 IP。适合已有域名并且希望使用固定域名访问本地服务的场景。

### 前提条件

- 域名已接入 Cloudflare，并且 DNS 记录已指向对应 Tunnel。
- Cloudflare Dashboard 中已创建 Named Tunnel。
- 本地服务已在 3000 端口启动。

### 1. 安装 cloudflared

macOS 可以使用 Homebrew 安装：

```bash
brew install cloudflared
```

如果已经安装过，Homebrew 可能提示：

```text
cloudflared is already installed and up-to-date
```

这表示程序本体已经存在，不需要重复安装。

### 2. 注册为系统服务

在 Cloudflare Tunnel 页面复制 macOS 的 service install 命令，格式类似：

```bash
sudo cloudflared service install <你的 tunnel token>
```

这个命令的作用是：

- 把当前 Tunnel 的 token 写入 macOS 系统服务配置。
- 创建系统级 LaunchDaemon：

```text
/Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

- 让 `cloudflared` 随系统启动，并在后台持续连接 Cloudflare。

> 注意：`<你的 tunnel token>` 是连接凭证，不要截图公开、不要提交到 Git、不要写入文档。

### 3. 重启 cloudflared 服务

如果服务已经安装，但需要立即重新拉起或重连，执行：

```bash
sudo launchctl kickstart -k system/com.cloudflare.cloudflared
```

这个命令的作用是：

- `launchctl`：macOS 管理后台服务的工具。
- `system/com.cloudflare.cloudflared`：表示操作系统级的 `cloudflared` 服务。
- `kickstart`：立即启动这个服务。
- `-k`：如果服务已经在运行，先杀掉旧进程，再重新启动。

简单理解：它不是安装，也不是卸载，而是“强制重启 cloudflared 系统服务”。

### 4. 查看服务状态

```bash
sudo launchctl print system/com.cloudflare.cloudflared
```

如果看到 `state = running`，表示 macOS 服务进程正在运行。

注意：服务运行不等于 Tunnel 一定连上 Cloudflare，还需要继续看日志。

### 5. 查看日志

```bash
tail -f /Library/Logs/com.cloudflare.cloudflared.err.log
```

常见成功日志包含类似：

```text
Registered tunnel connection
```

如果访问域名仍然失败，优先看这个日志判断是 DNS、网络、token、还是本地服务问题。

### 6. 卸载系统服务

如果需要删除当前注册的 cloudflared 系统服务，执行：

```bash
sudo cloudflared service uninstall
```

这个命令的作用是删除系统级服务配置：

```text
/Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

卸载后如需重新注册，再执行：

```bash
sudo cloudflared service install <你的 tunnel token>
sudo launchctl kickstart -k system/com.cloudflare.cloudflared
```

### 7. 常见问题

`cloudflared service is already installed`

说明已经存在系统服务：

```text
/Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

不要重复执行 `service install`。如果只是想重启，执行：

```bash
sudo launchctl kickstart -k system/com.cloudflare.cloudflared
```

如果确实要换 token 或重装服务，先卸载再安装：

```bash
sudo cloudflared service uninstall
sudo cloudflared service install <你的 tunnel token>
```

`cloudflared service uninstall` 提示删除 `~/Library/LaunchAgents/...` 失败

通常是因为安装时用了 `sudo`，服务被装到了系统级 `LaunchDaemons`；但卸载时没有用 `sudo`，命令去找用户级 `LaunchAgents`。正确命令是：

```bash
sudo cloudflared service uninstall
```

域名返回 `530`

Cloudflare `530` 通常表示 Cloudflare 已经收到请求，但 Tunnel 没有健康的连接。常见原因：

- 本地 `node server.js` 没有运行。
- 本地 `localhost:3000` 访问失败。
- `cloudflared` 服务没有运行。
- 当前网络阻断或劫持了 `cloudflared` 需要的 DNS / HTTPS / QUIC 连接。
- 电脑睡眠、关机或断网，导致本地 Tunnel 断开。

先按顺序检查：

```bash
curl -I http://localhost:3000
sudo launchctl print system/com.cloudflare.cloudflared
tail -f /Library/Logs/com.cloudflare.cloudflared.err.log
```

DNS 报 `lookup _v2-origintunneld._tcp.argotunnel.com ... no such host`

这通常不是 Cloudflare 配置错误，而是当前网络的 DNS 解析有问题。可以尝试：

```bash
networksetup -setdnsservers Wi-Fi 1.1.1.1 8.8.8.8
dscacheutil -flushcache
sudo launchctl kickstart -k system/com.cloudflare.cloudflared
```

如果仍失败，可能是公司网络、加域设备策略、代理或路由器劫持了 DNS。最快验证方式是切换到手机热点或使用 VPS 部署。

### 8. 本机部署限制

- 电脑睡眠、关机、断网时，Tunnel 会断开。
- Node 进程退出时，域名也无法访问到应用。
- 长期稳定部署建议放到 VPS 上，再用 `pm2` 或系统服务守护 Node 进程。

---

## 方式二：ngrok

ngrok 提供稳定的公网隧道，支持自定义子域名、请求面板查看、HTTPS 证书等。

### 1. 安装

```bash
brew install ngrok
```

### 2. 注册账号并获取 authtoken

- 访问 [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup) 注册免费账户。
- 登录后在 Dashboard 首页复制你的 authtoken。

### 3. 认证

```bash
ngrok config add-authtoken <你的 token>
```

### 4. 暴露端口

```bash
ngrok http 3000
```

启动后终端会显示公网地址，例如：

```text
Forwarding  https://xxxx.ngrok-free.app -> http://localhost:3000
```

此时通过 `https://xxxx.ngrok-free.app` 即可公网访问服务。ngrok 还会在本地启动 Web 面板 `http://127.0.0.1:4040`，可实时查看请求详情。

---

## 方式三：serveo.net

无需注册和安装，直接通过系统自带 SSH 即可使用。

### 前提条件

- 本地服务已在 3000 端口启动：`node server.js`
- 系统已安装 SSH 客户端。

### 命令

```bash
ssh -R 80:localhost:3000 serveo.net
```

执行后终端会输出公网地址，例如：

```text
Forwarding HTTP traffic from https://xxx.serveo.net
```

> 注意：serveo.net 为免费服务，SSH 连接断开后隧道立即失效，每次重连会分配不同的子域名。如需固定子域名，可使用 `ssh -R yourname:80:localhost:3000 serveo.net`，但可能已被占用。

---

## 方式四：VPS + Cloudflare Tunnel（长期部署建议）

如果需要长期稳定访问，推荐把 Node 服务部署到低成本 VPS，再在 VPS 上运行 `cloudflared`。

这种方式的优势：

- 本地电脑可以关机，不影响线上访问。
- VPS 网络更稳定，通常不会遇到公司网络 DNS 劫持。
- 可以用 `pm2` 或系统服务守护 Node 进程。

基本思路：

```text
用户访问 wpape.top
        ↓
Cloudflare
        ↓
Cloudflare Tunnel
        ↓
VPS 上的 cloudflared
        ↓
VPS localhost:3000 上的 Node 服务
```

常见守护方式：

```bash
npm install -g pm2
pm2 start server.js --name authcore
pm2 save
pm2 startup
```

数据库和上传目录需要定期备份：

```text
users.db
users.db-shm
users.db-wal
uploads/
```
