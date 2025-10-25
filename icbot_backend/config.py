from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Final

from pydantic import BaseModel, Field, HttpUrl, PositiveFloat, PositiveInt  # Defines configuration schema models.

PROJECT_ROOT: Final[Path] = Path(__file__).resolve().parents[1]  # Points to project root directory.
DEFAULT_ENV_PATH: Final[Path] = PROJECT_ROOT / "config.json"  # Default environment config path.
DEFAULT_APP_PATH: Final[Path] = PROJECT_ROOT / "app_config.json"  # Default application config path.


class ProviderConfig(BaseModel):  # Captures provider secret lookup metadata.
    api_key_env: str = Field(..., min_length=1)


class HttpDefaults(BaseModel):  # Describes shared HTTP fallbacks.
    default_timeout_seconds: PositiveFloat = 60


class EnvConfig(BaseModel):  # Represents runtime environment settings.
    environment: str = Field(..., min_length=1)
    llm_providers: dict[str, ProviderConfig] = Field(default_factory=dict)
    http: HttpDefaults = Field(default_factory=HttpDefaults)


class LlmRoute(BaseModel):  # Describes a concrete LLM route definition.
    provider: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    base_url: HttpUrl
    endpoint: str = Field(..., min_length=1)
    timeout_seconds: PositiveFloat
    max_retries: PositiveInt
    api_key_env: str | None = None
    requires_api_key: bool = True
    sequential: bool = False
    enforce_json: bool = True


class LlmRegistryEntry(BaseModel):  # Maps call sites to routes and schemas.
    route: str = Field(..., min_length=1)
    schema_path: str = Field(..., min_length=1)


class LlmConfig(BaseModel):  # Aggregates routes and registry entries.
    routes: dict[str, LlmRoute] = Field(default_factory=dict)
    registry: dict[str, LlmRegistryEntry] = Field(default_factory=dict)


class CompetencyLimits(BaseModel):  # Stores competency stage range.
    min: PositiveInt
    max: PositiveInt


class FlowConfig(BaseModel):  # Defines interview flow sequencing config.
    stages: list[str] = Field(default_factory=list)
    competency: CompetencyLimits


class RubricConfig(BaseModel):  # Configures rubric generation constraints.
    max_criteria_per_competency: PositiveInt = 3


class EvaluationConfig(BaseModel):  # Holds evaluation stage wiring.
    routes: dict[str, str] = Field(default_factory=dict)
    schema_registry: dict[str, str] = Field(default_factory=dict)
    weights: dict[str, float] = Field(default_factory=dict)


class AppConfig(BaseModel):  # Top-level application configuration model.
    llm: LlmConfig
    flow: FlowConfig
    rubric: RubricConfig = Field(default_factory=RubricConfig)
    evaluation: EvaluationConfig


def _load_json(path: Path) -> dict[str, Any]:  # Reads and parses JSON payloads from disk.
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_env_config(path: Path | None = None) -> EnvConfig:  # Returns cached environment configuration.
    config_path = path or DEFAULT_ENV_PATH
    payload = _load_json(config_path)
    return EnvConfig.model_validate(payload)


@lru_cache(maxsize=1)
def load_app_config(path: Path | None = None) -> AppConfig:  # Returns cached application configuration.
    config_path = path or DEFAULT_APP_PATH
    payload = _load_json(config_path)
    return AppConfig.model_validate(payload)
