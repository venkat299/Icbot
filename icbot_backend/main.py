from __future__ import annotations

import logging

import uvicorn  # Runs the FastAPI server.

from .api import app  # Imports FastAPI application.
from .config import load_app_config, load_env_config  # Ensures configuration is loaded.

UVICORN_LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(asctime)s %(levelname)s %(message)s",
            "datefmt": "%d-%m %H:%M",
        },
        "access": {
            "()": "uvicorn.logging.AccessFormatter",
            "fmt": "%(asctime)s %(levelname)s %(client_addr)s - \"%(request_line)s\" %(status_code)s",
            "datefmt": "%d-%m %H:%M",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "INFO"},
        "uvicorn.error": {"level": "INFO"},
        "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
    },
}  # Configures concise logging output.


def main() -> None:  # Starts the FastAPI server with formatted logging.
    load_env_config()
    load_app_config()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_config=UVICORN_LOGGING,
        log_level="info",
    )


if __name__ == "__main__":  # Supports python -m icbot_backend.main execution.
    main()
