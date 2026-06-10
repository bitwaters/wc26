# ─── Stage 1: 安装依赖 ────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: 构建 ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 开启 standalone 输出（最终镜像只含必要文件，体积 ~200 MB）
ENV DOCKER_BUILD=1
RUN npm run build

# ─── Stage 3: 运行时镜像 ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 用户运行（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone 服务入口
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public 目录（SVG 等）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 世界杯赛程静态 JSON（运行时读取）
COPY --from=builder --chown=nextjs:nodejs /app/src/data ./src/data

# data/ 目录将以 Volume 挂载，预先创建并赋权
RUN mkdir -p data && chown nextjs:nodejs data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
