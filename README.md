# ⚽ World Cup 2026 投注账本

> 个人 / 多人世界杯 2026 下注记账工具，支持 AI 自动同步比分、多玩家管理、盈亏统计。

**[Demo →](#)**  <!-- 上线后填入你的 Demo 地址 -->

---

## 功能特性

- **赛程总览** — 完整小组赛 + 淘汰赛日程，可手动录入或 AI 抓取比分
- **投注账本** — 支持胜平负 / 让球 / 大小球 / 波胆 / 自定义玩法
- **多玩家** — 为多人记账，各自独立预存金额（人民币 / USDT）
- **仪表盘** — 净利润、ROI、胜率、走势图，按玩家筛选
- **AI 同步比分** — 接入 Gemini / DeepSeek 等模型，自动抓取比分并结算注单
- **数据导出** — 一键导出全部注单 JSON 备份

---

## 技术栈

- [Next.js 15](https://nextjs.org/) (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- 文件存储（JSON，无需数据库）

---

## 快速部署

### 方式一：Docker Compose（推荐，一键启动）

**前提：** 服务器已安装 [Docker](https://docs.docker.com/engine/install/)（含 Compose 插件）

```bash
# 1. 克隆代码
git clone https://github.com/你的用户名/你的仓库.git wc26
cd wc26

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入随机生成的密钥：
#   openssl rand -hex 24

# 3. 一键启动（首次约 3~5 分钟）
docker compose up -d --build
```

启动后访问 `http://服务器IP`，进入「设置」页面填入同一密钥即可使用。

详细步骤（HTTPS、防火墙、备份等）见 [DEPLOY.md](./DEPLOY.md)。

---

### 方式二：本地开发

**前提：** Node.js 20+

```bash
git clone https://github.com/你的用户名/你的仓库.git
cd 仓库名
npm install
cp .env.example .env.local   # 可留空或填任意字符串
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `LOCAL_API_SECRET` | 否 | 写操作鉴权 Token，留空则不鉴权（仅建议本地开发时留空） |

AI 功能所需的 API Key（Gemini / DeepSeek）在网页「设置」页面填入，存储于服务器本地，不上传。

---

## 数据存储

所有数据保存在 `data/` 目录（Docker 部署时为 Named Volume `wc26_data`）：

```
data/
├── bets.json        # 注单
├── matches.json     # 比赛 & 比分
├── players.json     # 投注人
├── predictions.json # 小组赛预测排名
└── settings.json    # 设置（API Key 等）
```

> `settings.json` 含 AI API Key，请勿将 `data/` 提交到 Git 或公开分享。

---

## License

MIT
