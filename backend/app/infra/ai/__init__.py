"""Public exports for the internal AI SDK."""

from .client import (
    AIClient,
    AIClientDep,
    close_ai_client,
    create_ai_client,
    get_ai_client,
)
from .client_sync import AIClientSync, get_ai_client_sync
from .config import AISettings
from .exceptions import (
    AIAuthError,
    AIConfigError,
    AIError,
    AIPolicyDeniedError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIRequestCancelledError,
    AITimeoutError,
    AITransportError,
    AIUnsupportedCapabilityError,
    AIValidationError,
)
from .registry import ModelRegistry, build_default_registry
from .requests import (
    AudioGenerateRequest,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
    TextMessage,
)
from .responses import (
    AudioGenerateResponse,
    EmbeddingResponse,
    ImageGenerateResponse,
    TextGenerateResponse,
)
from .stream import (
    AIDoneEvent,
    AIErrorEvent,
    AIStartEvent,
    AIStreamEvent,
    AITextDeltaEvent,
    AITextEndEvent,
    AITextStartEvent,
    AIUsageEvent,
)
from .types import (
    AICapability,
    AIFinishReason,
    AIUsage,
    Artifact,
    ArtifactKind,
)

__all__ = [
    "AIAuthError",
    "AIClient",
    "AIClientDep",
    "AIClientSync",
    "AICapability",
    "AIConfigError",
    "AIDoneEvent",
    "AIError",
    "AIErrorEvent",
    "AIFinishReason",
    "AIProviderUnavailableError",
    "AIRateLimitError",
    "AIRequestCancelledError",
    "AISettings",
    "AIStartEvent",
    "AIStreamEvent",
    "AITextDeltaEvent",
    "AITextEndEvent",
    "AITextStartEvent",
    "AITimeoutError",
    "AITransportError",
    "AIUnsupportedCapabilityError",
    "AIUsage",
    "AIUsageEvent",
    "AIValidationError",
    "AIPolicyDeniedError",
    "Artifact",
    "ArtifactKind",
    "AudioGenerateRequest",
    "AudioGenerateResponse",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "ImageGenerateRequest",
    "ImageGenerateResponse",
    "ModelRegistry",
    "TextGenerateRequest",
    "TextGenerateResponse",
    "TextMessage",
    "build_default_registry",
    "close_ai_client",
    "create_ai_client",
    "get_ai_client",
    "get_ai_client_sync",
]
