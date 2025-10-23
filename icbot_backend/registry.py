from importlib import import_module
from typing import Tuple, Type

from pydantic import BaseModel  # Resolves schema classes for gateway bindings.

from .config import AppConfig, LlmRegistryEntry, LlmRoute, load_app_config  # Provides access to config models.


def _import_schema(path: str) -> Type[BaseModel]:  # Imports a Pydantic schema given a dotted path.
    module_name, class_name = path.rsplit(".", 1)
    module = import_module(module_name)
    candidate = getattr(module, class_name)
    if not issubclass(candidate, BaseModel):
        raise TypeError(f"{path} does not reference a Pydantic model")
    return candidate


def get_route(name: str, app_config: AppConfig | None = None) -> LlmRoute:  # Retrieves an LLM route by name.
    config = app_config or load_app_config()
    try:
        return config.llm.routes[name]
    except KeyError as exc:
        raise KeyError(f"Unknown LLM route '{name}'") from exc


def get_registry_entry(key: str, app_config: AppConfig | None = None) -> LlmRegistryEntry:  # Fetches registry entry data.
    config = app_config or load_app_config()
    try:
        return config.llm.registry[key]
    except KeyError as exc:
        raise KeyError(f"Unknown LLM registry key '{key}'") from exc


def resolve_binding(key: str, app_config: AppConfig | None = None) -> Tuple[LlmRoute, Type[BaseModel]]:  # Returns route and schema for a registry key.
    entry = get_registry_entry(key, app_config)
    route = get_route(entry.route, app_config)
    schema = _import_schema(entry.schema_path)
    return route, schema
