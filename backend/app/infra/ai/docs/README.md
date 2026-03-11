# AI SDK Usage Guide

`app.infra.ai` is the backend's internal unified AI SDK. It normalizes provider adapters, exceptions, telemetry, usage, streaming events, and small-scope technical retries.

This package does **not** own business policy. The business layer or a dedicated policy layer should decide:

- prompt assembly
- provider/model selection
- fallback
- request-level retry
- output validation
- cost control
- cache strategy
- tenant or plan policy
- degrade permissions

## Runtime Configuration

The default client reads a minimal nested configuration from `AISettings`.

```env
AI_RECORD_CONTENT=false
AI_CONTENT_PREVIEW_CHARS=500
AI_DEFAULT_TIMEOUT_MS=60000
AI_TECHNICAL_RETRY_COUNT=1
AI_TECHNICAL_RETRY_BACKOFF_MS=250

AI_OPENAI__API_KEY=
AI_OPENAI__BASE_URL=https://api.openai.com/v1

AI_ANTHROPIC__API_KEY=
AI_ANTHROPIC__BASE_URL=https://api.anthropic.com/v1
AI_ANTHROPIC__API_VERSION=2023-06-01

AI_GEMINI__API_KEY=
AI_GEMINI__BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

Only provider credentials, base URLs, telemetry options, and technical retry knobs live in infra config.

## Quick Start

Business code must pass an explicit `provider` and `model`.

```python
from app.infra.ai.client import get_ai_client
from app.infra.ai.requests import TextGenerateRequest, TextMessage

client = get_ai_client()

response = await client.text.generate(
    TextGenerateRequest(
        provider="openai",
        model="gpt-4o-mini",
        messages=[
            TextMessage(role="system", content="You are a precise assistant."),
            TextMessage(role="user", content="Summarize this release note."),
        ],
        temperature=0.2,
    )
)

print(response.text)
print(response.usage.total_tokens)
print(response.attempt_count)
```

The response includes normalized metadata such as:

- `request_id`
- `provider_request_id`
- `provider`
- `model`
- `usage`
- `latency_ms`
- `attempt_count`
- `attempts`

## Streaming Text

The SDK always returns structured stream events instead of provider-native chunks.

```python
from app.infra.ai.client import get_ai_client
from app.infra.ai.requests import TextGenerateRequest, TextMessage

client = get_ai_client()

async for event in client.text.stream(
    TextGenerateRequest(
        provider="anthropic",
        model="claude-sonnet-4-5",
        messages=[TextMessage(role="user", content="Write a short haiku about APIs.")],
    )
):
    if event.event == "text_delta":
        print(event.delta, end="")
    elif event.event == "error":
        print(event.error.message)
```

Supported event types:

- `start`
- `text_start`
- `text_delta`
- `text_end`
- `usage`
- `done`
- `error`

If a stream fails after partial output is visible, the SDK preserves `partial_text` on the terminal `error` event. Before any visible output is emitted, the SDK may perform a same-route technical retry.

## Embedding / Image / Audio

```python
from app.infra.ai.client import get_ai_client
from app.infra.ai.requests import AudioGenerateRequest, EmbeddingRequest, ImageGenerateRequest

client = get_ai_client()

embedding = await client.embedding.embed(
    EmbeddingRequest(
        provider="openai",
        model="text-embedding-3-small",
        input=["hello", "world"],
    )
)

image = await client.image.generate(
    ImageGenerateRequest(
        provider="gemini",
        model="gemini-2.5-flash-image",
        prompt="A watercolor fox reading a newspaper",
    )
)

audio = await client.audio.generate(
    AudioGenerateRequest(
        provider="openai",
        model="gpt-4o-mini-tts",
        input_text="Welcome to the unified AI SDK.",
        voice="alloy",
    )
)
```

## FastAPI Integration

```python
from fastapi import APIRouter

from app.infra.ai.client import AIClientDep
from app.infra.ai.requests import TextGenerateRequest, TextMessage

router = APIRouter()


@router.post("/ai/demo")
async def run_demo(ai_client: AIClientDep) -> dict[str, str]:
    response = await ai_client.text.generate(
        TextGenerateRequest(
            provider="gemini",
            model="gemini-2.5-flash",
            messages=[TextMessage(role="user", content="Say hello in one sentence.")],
        )
    )
    return {"text": response.text}
```

## Optional Capability Catalog

The default registry only wires provider runtime config. If you want stricter capability checks, register concrete model metadata explicitly.

```python
from app.core import settings
from app.infra.ai.types import AICapability
from app.infra.ai.registry import build_default_registry
from app.infra.ai.types import AIModality, ModelSpec

registry = build_default_registry(settings.ai)
registry.register_model(
    ModelSpec(
        alias="openai:gpt-4o-mini",
        provider="openai",
        model_id="gpt-4o-mini",
        capabilities=(AICapability.TEXT_GENERATION,),
        input_modalities=(AIModality.TEXT,),
        output_modalities=(AIModality.TEXT,),
        supports_stream=True,
        supports_json=True,
    )
)
```

This keeps model selection in business code while still letting infra enforce capability metadata when you choose to supply it.

## Sync Facade

For scripts and one-off tools, the SDK also exposes a sync wrapper:

```python
from app.infra.ai.client_sync import get_ai_client_sync
from app.infra.ai.requests import TextGenerateRequest, TextMessage

client = get_ai_client_sync()
response = client.text.generate(
    TextGenerateRequest(
        provider="openai",
        model="gpt-4o-mini",
        messages=[TextMessage(role="user", content="Reply with OK.")],
    )
)
```

`AIClientSync` must not be used inside an active event loop.
