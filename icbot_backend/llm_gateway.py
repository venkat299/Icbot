from __future__ import annotations

import json
import os
from typing import Any, Iterable, Type

from langchain_core.messages import AIMessage, BaseMessage, ChatMessage, HumanMessage, SystemMessage  # Manages LangChain message types.
from langchain_core.prompt_values import ChatPromptValue  # Supports prompt value normalization.
from langchain_core.runnables import RunnableLambda  # Provides runnable wrapper for pipelines.
from langchain_openai import ChatOpenAI  # Supplies OpenAI chat client adapter.
from pydantic import BaseModel  # Validates structured LLM responses.

from .config import EnvConfig, LlmRoute, load_env_config  # Accesses route and environment settings.


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


def _build_model(route: LlmRoute, env: EnvConfig) -> ChatOpenAI:  # Instantiates the concrete chat model.
    provider = route.provider.lower()
    if provider != "openai":
        raise ValueError(f"Unsupported LLM provider '{route.provider}'")
    provider_cfg = env.llm_providers.get("openai")
    if not provider_cfg:
        raise RuntimeError("Missing OpenAI provider configuration")
    api_key = os.getenv(provider_cfg.api_key_env)
    if not api_key:
        raise RuntimeError(f"Environment variable '{provider_cfg.api_key_env}' is not set")
    return ChatOpenAI(
        model=route.model,
        api_key=api_key,
        base_url=str(route.base_url),
        max_retries=route.max_retries,
        request_timeout=route.timeout_seconds,
        response_format={"type": "json_object"},
        temperature=0
    )


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
    text = _read_text(message).strip()
    return schema.model_validate_json(text)


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
