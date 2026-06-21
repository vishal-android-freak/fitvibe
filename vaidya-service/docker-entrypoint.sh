#!/bin/sh
# Build a container-local Pi agent dir from the mounted host login.
#
# We do NOT use the host's ~/.pi/agent directly: its settings.json eagerly loads
# several host-installed packages (pi-subagents, pi-web-access, rpiv-*) that hang
# at session_start in a headless container. We need only the login + the MCP
# adapter. So we assemble a clean agent dir at $PI_CODING_AGENT_DIR that reuses
# the host's npm packages (the adapter, with the correct Linux koffi build) but
# with a minimal settings.json that loads ONLY pi-mcp-adapter.
set -e

HOST_AGENT=/pi-host          # host ~/.pi/agent, mounted read-only
AGENT="${PI_CODING_AGENT_DIR:-/app/.pi-agent}"

mkdir -p "$AGENT"

# Login + model registry come straight from the host (copy auth so it's writable
# if Pi rotates it; the rest can be symlinked read-only).
cp -f "$HOST_AGENT/auth.json" "$AGENT/auth.json" 2>/dev/null || {
  echo "ERROR: no auth.json at $HOST_AGENT — run 'pi' on the host, and mount ~/.pi/agent." >&2
  exit 1
}
[ -f "$HOST_AGENT/models.json" ] && cp -f "$HOST_AGENT/models.json" "$AGENT/models.json" 2>/dev/null || true

# Reuse the host's installed npm packages (has pi-mcp-adapter + its Linux deps).
rm -rf "$AGENT/npm"
ln -s "$HOST_AGENT/npm" "$AGENT/npm"

# Minimal settings: load ONLY the MCP adapter (skip the packages that hang headless).
cat > "$AGENT/settings.json" <<'JSON'
{
  "theme": "dark",
  "defaultThinkingLevel": "medium",
  "packages": ["npm:pi-mcp-adapter"]
}
JSON

# Sessions are written under $AGENT/sessions — make sure it's writable.
mkdir -p "$AGENT/sessions"

echo "[entrypoint] prepared Pi agent dir at $AGENT (adapter-only settings)"
exec node dist/index.js
