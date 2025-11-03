from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterable, Type

from langchain_core.messages import AIMessage, BaseMessage, ChatMessage, HumanMessage, SystemMessage  # Manages LangChain message types.
from langchain_core.prompt_values import ChatPromptValue  # Supports prompt value normalization.
from langchain_core.runnables import RunnableLambda  # Provides runnable wrapper for pipelines.
from langchain_openai import ChatOpenAI  # Supplies OpenAI chat client adapter.
from pydantic import BaseModel, ValidationError  # Validates structured LLM responses.

from .config import EnvConfig, LlmRoute, load_env_config  # Accesses route and environment settings.


_ANON_API_KEY = "anonymous"  # Placeholder for routes that skip authentication.
logger = logging.getLogger(__name__)


def _system_hint(schema: Type[BaseModel], extra_hint: str | None) -> str:  # Builds enforced JSON response instruction.
    schema_json = json.dumps(schema.model_json_schema(), separators=(",", ":"))
    prefix = "Reply with a single JSON object matching this schema."
    message = f"{prefix} {extra_hint.strip()}" if extra_hint else prefix
    return f"{message} Schema:{schema_json}"


def _read_text(message: AIMessage | ChatMessage) -> str:  # Extracts string content from model responses.
    if isinstance(message.content, str):
        return message.content
    parts = []
    for chunk in message.content:
        if isinstance(chunk, dict) and chunk.get("type") == "text":
            parts.append(chunk.get("text", ""))
    return "".join(parts)


def _normalize_json_payload(text: str) -> str:  # Extracts JSON payload from fenced responses.
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    while lines and lines[-1].strip() == "```":
        lines.pop()
    return "\n".join(lines).strip() or stripped


def _truncate(text: str, limit: int = 600) -> str:  # Truncates large payloads for logging.
    return text if len(text) <= limit else f"{text[:limit]}..."


def _extract_json_object(text: str) -> str:  # Parses the first JSON object and drops trailing commentary.
    stripped = text.strip()
    if not stripped:
        return stripped
    decoder = json.JSONDecoder()
    try:
        value, end = decoder.raw_decode(stripped)
    except json.JSONDecodeError:
        return stripped
    remainder = stripped[end:].strip()
    if remainder:
        logger.warning(
            "LLM payload included trailing text after JSON | trailing_snippet=%s",
            _truncate(remainder),
        )
    return json.dumps(value, separators=(",", ":"))


def _build_model(route: LlmRoute, env: EnvConfig) -> ChatOpenAI:  # Instantiates the concrete chat model.
    provider = route.provider.lower()
    if provider != "openai":
        raise ValueError(f"Unsupported LLM provider '{route.provider}'")
    provider_cfg = env.llm_providers.get("openai")
    if not provider_cfg:
        raise RuntimeError("Missing OpenAI provider configuration")
    api_key = _resolve_api_key(route, provider_cfg.api_key_env)
    model_kwargs: dict[str, Any] = {}
    if route.enforce_json:
        model_kwargs["response_format"] = {"type": "json_object"}

    kwargs: dict[str, Any] = {
        "model": route.model,
        "api_key": api_key,
        "base_url": str(route.base_url),
        "max_retries": route.max_retries,
        "request_timeout": route.timeout_seconds,
        "temperature": 0,
    }
    if model_kwargs:
        kwargs["model_kwargs"] = model_kwargs

    return ChatOpenAI(**kwargs)


def _resolve_api_key(route: LlmRoute, provider_env: str) -> str:  # Chooses the API key or placeholder for a route.
    env_name = route.api_key_env or provider_env
    if not env_name:
        if route.requires_api_key:
            raise RuntimeError(f"No API key environment configured for route '{route.model}'")
        return _ANON_API_KEY
    api_key = os.getenv(env_name)
    if api_key:
        return api_key
    if route.requires_api_key:
        raise RuntimeError(f"Environment variable '{env_name}' is not set")
    return _ANON_API_KEY


def _augment_messages(messages: Iterable[BaseMessage], schema: Type[BaseModel], extra_hint: str | None) -> list[BaseMessage]:  # Prepends JSON enforcement hint.
    system_message = SystemMessage(content=_system_hint(schema, extra_hint))
    return [system_message, *messages]


def _ensure_messages(payload: Any) -> list[BaseMessage]:  # Normalizes runnable input into message lists.
    if isinstance(payload, ChatPromptValue):
        return list(payload.to_messages())
    if isinstance(payload, BaseMessage):
        return [payload]
    if isinstance(payload, Iterable):
        messages = list(payload)
        if all(isinstance(item, BaseMessage) for item in messages):
            return messages
    raise TypeError("LLM gateway expects LangChain chat messages as input")


def _parse_response(message: AIMessage | ChatMessage, schema: Type[BaseModel]) -> BaseModel:  # Parses and validates the response message.
    payload = _extract_json_object(_normalize_json_payload(_read_text(message)))
    try:
        return schema.model_validate_json(payload)
    except ValidationError as exc:
        logger.error(
            "LLM response schema validation failed | schema=%s | errors=%s | payload_snippet=%s",
            schema.__name__,
            exc.errors(),
            _truncate(payload),
        )
        raise
    except ValueError as exc:
        logger.error(
            "LLM response parsing failed | schema=%s | error=%s | payload_snippet=%s",
            schema.__name__,
            exc,
            _truncate(payload),
        )
        raise


def call(task: str, schema: Type[BaseModel], *, cfg: LlmRoute, env: EnvConfig | None = None, extra_hint: str | None = None) -> BaseModel:  # Executes a one-shot LLM call and returns typed output.
    environment = env or load_env_config()
    model = _build_model(cfg, environment)
    messages = _augment_messages([HumanMessage(content=task)], schema, extra_hint)
    response = model.invoke(messages)
    return _parse_response(response, schema)


def runnable(cfg: LlmRoute, schema: Type[BaseModel], *, env: EnvConfig | None = None, extra_hint: str | None = None) -> RunnableLambda:  # Provides a runnable that validates outputs against a schema.
    environment = env or load_env_config()
    model = _build_model(cfg, environment)

    def _invoke(payload: Any) -> BaseModel:  # Invokes the underlying model with enforced JSON schema.
        messages = _ensure_messages(payload)
        augmented = _augment_messages(messages, schema, extra_hint)
        response = model.invoke(augmented)
        return _parse_response(response, schema)

    return RunnableLambda(_invoke)
