# Exposes FastAPI application for candidate service.
from .server import app  # Re-exports FastAPI app instance.

__all__ = ["app"]
