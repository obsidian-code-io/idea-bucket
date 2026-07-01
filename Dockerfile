# --- Build stage: install deps + build Tailwind CSS ------------------------
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build:css   # @tailwindcss/cli -> public/styles.css

# --- Runtime stage ---------------------------------------------------------
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# Data volume mount point (SQLite file + uploads). Owned by the bun user.
RUN mkdir -p /data/uploads && chown -R bun:bun /data
USER bun
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
