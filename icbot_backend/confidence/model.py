# Implements Bayesian smoothing for criterion confidence.
from __future__ import annotations

from math import pow
from typing import Iterable

from pydantic import BaseModel, Field, model_validator  # Validates confidence payloads.

from ..config import ConfidenceModelConfig  # Supplies tuning parameters.


class ConfidencePosterior(BaseModel):  # Holds Dirichlet-style weights per level.
    level_weights: tuple[float, float, float, float, float, float] = Field(..., min_length=6, max_length=6)

    @model_validator(mode="after")
    def _ensure_positive(cls, values: "ConfidencePosterior") -> "ConfidencePosterior":  # Guards against degenerate weights.
        if any(weight <= 0.0 for weight in values.level_weights):
            raise ValueError("confidence posterior weights must be positive.")
        return values

    @property
    def total(self) -> float:  # Returns total evidence mass.
        return float(sum(self.level_weights))


class ConfidenceObservation(BaseModel):  # Represents a single evaluator emission.
    level: int = Field(..., ge=0, le=5)
    confidence: float = Field(..., ge=0.0, le=1.0)


class ConfidenceSummary(BaseModel):  # Summarizes posterior into usable scores.
    level: int = Field(..., ge=0, le=5)
    confidence: float = Field(..., ge=0.0, le=1.0)
    distribution: tuple[float, float, float, float, float, float] = Field(..., min_length=6, max_length=6)


class ConfidenceModel:  # Aggregates evaluator signals into Bayesian posteriors.
    def __init__(self, config: ConfidenceModelConfig) -> None:
        self._config = config

    def initialize(self) -> ConfidencePosterior:  # Returns the configured prior.
        weights = tuple(float(value) for value in self._config.prior)
        return ConfidencePosterior(level_weights=weights)

    def observe(self, posterior: ConfidencePosterior, observation: ConfidenceObservation) -> ConfidencePosterior:  # Updates posterior with a new observation.
        weights = list(posterior.level_weights)
        increment = max(self._config.min_increment, observation.confidence) * self._config.weight_scale
        weights[observation.level] = weights[observation.level] + increment
        return ConfidencePosterior(level_weights=tuple(weights))  # type: ignore[arg-type]

    def summarize(self, posterior: ConfidencePosterior) -> ConfidenceSummary:  # Converts posterior to level and confidence.
        total = posterior.total
        if total <= 0.0:
            distribution = (1 / 6,) * 6
            return ConfidenceSummary(level=3, confidence=0.0, distribution=distribution)
        distribution = tuple(weight / total for weight in posterior.level_weights)
        best_level = int(max(range(6), key=lambda idx: distribution[idx]))
        mass = distribution[best_level]
        adjusted = pow(mass, self._config.sharpness)
        expected = sum(idx * dist for idx, dist in enumerate(distribution))
        level = int(round(expected))
        level = max(0, min(5, level))
        return ConfidenceSummary(level=level, confidence=min(1.0, max(0.0, adjusted)), distribution=distribution)

    @staticmethod
    def blend(posteriors: Iterable[ConfidencePosterior]) -> ConfidencePosterior:  # Merges multiple posteriors when needed.
        aggregate = [0.0] * 6
        for posterior in posteriors:
            for idx, weight in enumerate(posterior.level_weights):
                aggregate[idx] += weight
        aggregate = [weight if weight > 0.0 else 1e-6 for weight in aggregate]
        return ConfidencePosterior(level_weights=tuple(aggregate))  # type: ignore[arg-type]
