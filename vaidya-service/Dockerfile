# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to production deps for the runtime image.
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Pi skills + MCP config.
COPY .pi ./.pi
# loadPrompt() resolves prompt .md files relative to the compiled load.js, i.e.
# dist/prompts/. tsc only emits .ts, so copy the .md prompts into dist/prompts.
COPY src/prompts ./dist/prompts

# In the container the MCP server is reachable on the compose network as
# `vaidya-mcp`, not localhost. Overwrite the dev mcp.json with the container URL.
RUN printf '%s\n' \
  '{' \
  '  "mcpServers": {' \
  '    "vaidya": {' \
  '      "url": "http://vaidya-mcp:8765/mcp",' \
  '      "auth": false,' \
  '      "directTools": true,' \
  '      "lifecycle": "eager"' \
  '    }' \
  '  }' \
  '}' > .pi/mcp.json

EXPOSE 8090
# The HTTP server exposes /healthz.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8090/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" || exit 1

# Pi reads ~/.pi/agent (auth.json + the pi-mcp-adapter extension + settings),
# which is bind-mounted from the host in docker-compose. Run as root so the
# default HOME=/root matches that mount target; the service writes session
# transcripts under its cwd (/app), which is writable.
ENTRYPOINT ["node", "dist/index.js"]
