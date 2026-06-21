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
# `vaidya-mcp` (not localhost), and the agent runs HEADLESS (no TTY) — which
# needs keep-alive + samplingAutoApprove so the agent loop doesn't stall waiting
# on UI-gated handshakes. Use the container-specific mcp.json.
COPY mcp.docker.json ./.pi/mcp.json

# Pi uses a CONTAINER-LOCAL agent dir assembled by the entrypoint from the
# read-only host login mounted at /pi-host — not the host dir directly, whose
# settings.json eagerly loads packages that hang headless in a container.
ENV PI_CODING_AGENT_DIR=/app/.pi-agent
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8090
# The HTTP server exposes /healthz.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8090/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
