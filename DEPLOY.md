# 部署教程：World Cup 2026 投注账本

> Docker Compose 一键部署，适用于任意装有 Docker 的 Linux 服务器  
>（阿里云、腾讯云、轻量应用服务器等均可，1 核 1 GB 足够）

---

## 文件结构

部署后服务器上的目录结构：

```
/home/wc26/
├── .env.local          ← 你手动创建，含 API 密钥（不提交 Git）
├── docker-compose.yml
├── Dockerfile
├── nginx/
│   ├── default.conf    ← Nginx 反向代理配置
│   └── certs/          ← HTTPS 证书（可选）
└── ...（其余代码文件）
```

数据文件（注单、设置等）保存在 Docker Named Volume `wc26_data` 中，  
容器重建/升级时数据不丢失。

---

## 第一步：服务器安装 Docker

```bash
# 一键安装 Docker（官方脚本，适用 Ubuntu/Debian/CentOS）
curl -fsSL https://get.docker.com | bash

# 国内服务器如果连接慢，用阿里云镜像
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 安装 Docker Compose（通常 Docker Desktop / 新版 Docker 已内置）
docker compose version   # 能输出版本号则跳过下一行
apt install -y docker-compose-plugin  # 若上面命令报错则执行

# 启动 Docker 并设为开机自启
systemctl enable --now docker
```

---

## 第二步：上传代码到服务器

### 方式 A：Git（推荐，方便后续更新）

```bash
cd /home
git clone https://github.com/你的用户名/你的仓库.git wc26
```

### 方式 B：rsync 本地直传（无 Git 仓库时）

```bash
# 在本地机器执行，排除无需上传的目录
rsync -avz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='data' \
  --exclude='.git' \
  /Users/yang/Documents/antigravity/delightful-bohr/ \
  root@你的服务器IP:/home/wc26/
```

---

## 第三步：创建 .env.local

```bash
cd /home/wc26

# 生成一个随机强密钥
openssl rand -hex 24
# 示例输出：a3f8c2e1d4b5a6789012345678901234567890ab12

# 创建配置文件（把上面生成的值填进去）
cat > .env.local << 'EOF'
LOCAL_API_SECRET=把上面生成的密钥粘贴到这里
EOF

chmod 600 .env.local
```

> **记住这个密钥**——进入网页「设置」→「本地 API 令牌」需要填入相同的值。

---

## 第四步：一键启动

```bash
cd /home/wc26

docker compose up -d --build
```

Docker 会自动完成：
1. 安装 Node 依赖
2. 构建 Next.js（standalone 模式，镜像约 200 MB）
3. 启动 App 容器 + Nginx 容器
4. 创建持久化数据卷

**首次构建约 3~5 分钟**，完成后：

```bash
docker compose ps       # 查看容器状态（应为 running）
docker compose logs -f  # 查看实时日志（Ctrl+C 退出）
```

打开 `http://你的服务器IP` 即可访问。

---

## 第五步：防火墙

```bash
# 放行 HTTP / HTTPS / SSH
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## 可选：绑定域名 + HTTPS

### 方式 A：Certbot（免费 Let's Encrypt 证书）

```bash
# 安装 certbot
apt install -y certbot

# 申请证书（临时停止 Nginx 让 certbot 使用 80 端口验证）
docker compose stop nginx
certbot certonly --standalone -d 你的域名.com
docker compose start nginx

# 证书位置
ls /etc/letsencrypt/live/你的域名.com/
# fullchain.pem  privkey.pem

# 复制证书到 nginx/certs（容器内挂载路径）
mkdir -p /home/wc26/nginx/certs
cp /etc/letsencrypt/live/你的域名.com/fullchain.pem /home/wc26/nginx/certs/
cp /etc/letsencrypt/live/你的域名.com/privkey.pem  /home/wc26/nginx/certs/
chmod 600 /home/wc26/nginx/certs/*.pem
```

然后编辑 `nginx/default.conf`，取消 HTTPS server 块的注释，并把域名替换进去：

```bash
nano /home/wc26/nginx/default.conf
# 修改完后重载 Nginx（不停机）
docker compose exec nginx nginx -s reload
```

### 方式 B：使用云服务商 SLB / CLB 做 HTTPS 卸载

域名 + 证书配置在云控制台，后端仅需开 HTTP 80 端口，无需修改 Nginx 配置。

---

## 日常运维命令

```bash
# ── 查看状态 ──────────────────────────
docker compose ps
docker compose logs -f app      # 只看 app 日志
docker compose logs -f nginx    # 只看 nginx 日志

# ── 更新代码后重新部署 ─────────────────
cd /home/wc26
git pull                        # 或重新 rsync
docker compose up -d --build    # 重建镜像并热切换容器

# ── 停止 / 重启 ───────────────────────
docker compose stop
docker compose restart app

# ── 手动备份数据 ──────────────────────
docker run --rm \
  -v wc26_wc26_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/wc26_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data

# ── 恢复备份 ─────────────────────────
docker run --rm \
  -v wc26_wc26_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/wc26_backup_xxx.tar.gz -C /

# ── 查看数据卷 ────────────────────────
docker volume inspect wc26_wc26_data
```

---

## 自动备份（定时任务）

```bash
crontab -e

# 每天凌晨 3 点备份，保留最近 30 天
0 3 * * * docker run --rm -v wc26_wc26_data:/data -v /home/backups:/backup alpine tar czf /backup/wc26_$(date +\%Y\%m\%d).tar.gz /data 2>/dev/null
0 4 * * * find /home/backups -name 'wc26_*.tar.gz' -mtime +30 -delete
```

---

## 使用说明（首次打开）

1. 访问 `http://服务器IP`（或你的域名）
2. 进入**设置**页面
3. 在「本地 API 令牌」栏填入第三步生成的 `LOCAL_API_SECRET` 值
4. 保存后即可正常使用所有写入功能

> 令牌存储在浏览器 sessionStorage，关闭标签页后需重新填入。

---

## 常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| `docker compose up` 构建失败 | 网络访问 npm 超时 | 见下方「国内加速」 |
| 502 Bad Gateway | app 容器未就绪 | 等 10 秒后刷新，或 `docker compose logs app` 查看 |
| 操作报 401 | 未在设置页填令牌 | 进设置页填入 LOCAL_API_SECRET |
| 数据消失 | rsync 时覆盖了 volume | rsync 加 `--exclude='data'` |
| 端口 80 被占用 | 服务器已有 Nginx | 停止原 Nginx：`systemctl stop nginx` |

### 国内服务器构建加速（npm 镜像）

在 `Dockerfile` 的 `npm ci` 前添加：

```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```
