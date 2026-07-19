# Grok-Wiki reader: builds the static frontend and serves it plus the API with Bun.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
# Optional: mount or bake wikis and point the scanner at them.
# ENV GROK_WIKI_ROOT=/data/wikis
COPY --from=build /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
EXPOSE 4173
CMD ["bun", "server/index.ts"]
