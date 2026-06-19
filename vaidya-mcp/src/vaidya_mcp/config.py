"""Environment config for the Vaidya MCP server. Fails fast on what's required."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str  # read-only role DSN
    go_token_socket: str  # unix socket path to the Go token provider ("" if unused)
    go_token_url: str  # http base for the Go token provider ("" if unused)
    internal_token_secret: str
    google_ha_base: str

    @staticmethod
    def load() -> "Config":
        db = os.environ.get("DATABASE_URL_READONLY", "")
        if not db:
            raise RuntimeError("DATABASE_URL_READONLY is required")
        return Config(
            database_url=db,
            go_token_socket=os.environ.get("GO_TOKEN_SOCKET", ""),
            go_token_url=os.environ.get("GO_TOKEN_URL", ""),
            internal_token_secret=os.environ.get("INTERNAL_TOKEN_SECRET", ""),
            google_ha_base=os.environ.get("GOOGLE_HA_BASE", "https://health.googleapis.com/v4"),
        )
