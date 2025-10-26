from __future__ import annotations

import logging
from typing import Final

_LOG_FORMAT: Final[str] = "%(name)s %(message)s"  # Stream format for flow traces.


def structured_stream_logger(name: str, level: int = logging.INFO) -> logging.Logger:  # Returns a configured stream logger.
    logger = logging.getLogger(name)
    if not any(isinstance(handler, logging.StreamHandler) for handler in logger.handlers):
        handler = logging.StreamHandler()
        handler.setLevel(level)
        handler.setFormatter(logging.Formatter(_LOG_FORMAT))
        logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return logger
