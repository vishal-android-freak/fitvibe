# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    MCP_HOST=0.0.0.0 \
    MCP_PORT=8765
WORKDIR /app

# Install the package (psycopg[binary] ships its own libpq — no apt needed).
COPY pyproject.toml ./
COPY src ./src
RUN pip install --upgrade pip && pip install .

# A non-root user; copy the provisioning SQL so it can be referenced if mounted.
RUN useradd -u 10001 -m app
COPY sql ./sql
USER app

EXPOSE 8765
# FastMCP serves /mcp; a TCP connect check is enough for the healthcheck.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD python -c "import socket,os; s=socket.create_connection(('127.0.0.1', int(os.environ.get('MCP_PORT','8765'))), 3); s.close()" || exit 1
ENTRYPOINT ["python", "-m", "vaidya_mcp.server"]
