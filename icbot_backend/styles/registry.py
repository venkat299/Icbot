from __future__ import annotations  # Provides accessors for style catalog entries.

from functools import lru_cache

from ..config import AppConfig, load_app_config
from .base import StyleSpec


class StylesRegistry:  # Offers read-only access to configured style specs.
    def __init__(self, config: AppConfig | None = None) -> None:
        self._config = config or load_app_config()

    def list_ids(self) -> list[str]:  # Returns sorted style identifiers.
        return sorted(self._config.styles.catalog.keys())

    def get(self, style_id: str) -> StyleSpec:  # Retrieves a style spec by id.
        try:
            spec = self._config.styles.catalog[style_id]
        except KeyError as exc:
            raise KeyError(f"Unknown style '{style_id}'") from exc
        return spec.model_copy(deep=True)


@lru_cache(maxsize=1)
def get_registry() -> StylesRegistry:  # Provides a cached registry instance.
    return StylesRegistry()


def get_style(style_id: str, *, config: AppConfig | None = None) -> StyleSpec:  # Convenience helper for single lookups.
    registry = StylesRegistry(config) if config else get_registry()
    return registry.get(style_id)
