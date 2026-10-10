import contextvars
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="")

SAFE_CORRELATION_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-\.]{8,128}$")


def get_correlation_id() -> str:
    return correlation_id_ctx.get() or "unknown"


def set_correlation_id(correlation_id: str) -> contextvars.Token:
    clean_id = correlation_id.strip() if correlation_id else ""
    if not clean_id or not SAFE_CORRELATION_ID_REGEX.match(clean_id):
        import uuid
        clean_id = str(uuid.uuid4())
    return correlation_id_ctx.set(clean_id)


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured, privacy-safe JSON without credentials or raw prompts."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "soulsync-agent",
            "level": record.levelname,
            "correlationId": get_correlation_id(),
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include safe extra attributes if provided
        for attr in ("operation", "tool", "durationMs", "status", "threadId"):
            if hasattr(record, attr):
                log_obj[attr] = getattr(record, attr)

        return json.dumps(log_obj)


def setup_logging(level: int = logging.INFO) -> None:
    """Configures structured JSON logging on the root handler."""
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Replace existing handlers with structured JSON handler
    root_logger.handlers = [handler]
