from __future__ import annotations  # Provides accessors for style catalog entries.

from functools import lru_cache

from ..config import StylesConfig, load_styles_config
from .base import StyleSpec


class StylesRegistry:  # Offers read-only access to configured style specs.
    def __init__(self, config: StylesConfig | None = None) -> None:
        self._config = config or load_styles_config()

    def list_ids(self) -> list[str]:  # Returns sorted style identifiers.
        return sorted(self._config.catalog.keys())

    def get(self, style_id: str) -> StyleSpec:  # Retrieves a style spec by id.
        try:
            spec = self._config.catalog[style_id]
        except KeyError as exc:
            raise KeyError(f"Unknown style '{style_id}'") from exc
        return spec.model_copy(deep=True)


@lru_cache(maxsize=1)
def get_registry() -> StylesRegistry:  # Provides a cached registry instance.
    return StylesRegistry()


def get_style(style_id: str, *, config: StylesConfig | None = None) -> StyleSpec:  # Convenience helper for single lookups.
    registry = StylesRegistry(config) if config else get_registry()
    return registry.get(style_id)
