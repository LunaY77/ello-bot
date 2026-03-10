"""Provider adapter contract for the internal AI SDK."""

from __future__ import annotations

from collections.abc import AsyncIterator

from ..exceptions import AIUnsupportedCapabilityError
from ..requests import (
    AudioGenerateRequest,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
)
from ..responses import (
    AudioGenerateResponse,
    EmbeddingResponse,
    ImageGenerateResponse,
    TextGenerateResponse,
)
from ..stream import AnyAIStreamEvent
from ..types import ProviderRequestContext, ResolvedModel


class ProviderAdapter:
    """Define the protocol every provider adapter must satisfy."""

    async def aclose(self) -> None:
        """Release any network resources owned by the adapter.

        Args:
            None.

        Returns:
            None.
        """
        return None

    async def generate_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> TextGenerateResponse:
        """Generate a complete text response.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized text generation response.
        """
        raise AIUnsupportedCapabilityError(
            "Text generation is not supported by this provider adapter",
            provider=model.provider,
            model=model.model_id,
        )

    async def stream_text(
        self,
        request: TextGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> AsyncIterator[AnyAIStreamEvent]:
        """Stream text generation events.

        Args:
            request: Normalized SDK text generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            An async iterator of normalized stream events.
        """
        raise AIUnsupportedCapabilityError(
            "Text streaming is not supported by this provider adapter",
            provider=model.provider,
            model=model.model_id,
        )

    async def embed(
        self,
        request: EmbeddingRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> EmbeddingResponse:
        """Generate embeddings for one or more texts.

        Args:
            request: Normalized SDK embedding request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized embedding response.
        """
        raise AIUnsupportedCapabilityError(
            "Embedding is not supported by this provider adapter",
            provider=model.provider,
            model=model.model_id,
        )

    async def generate_image(
        self,
        request: ImageGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> ImageGenerateResponse:
        """Generate images from a prompt.

        Args:
            request: Normalized SDK image generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized image generation response.
        """
        raise AIUnsupportedCapabilityError(
            "Image generation is not supported by this provider adapter",
            provider=model.provider,
            model=model.model_id,
        )

    async def generate_audio(
        self,
        request: AudioGenerateRequest,
        model: ResolvedModel,
        context: ProviderRequestContext,
    ) -> AudioGenerateResponse:
        """Generate audio artifacts from text input.

        Args:
            request: Normalized SDK audio generation request.
            model: Resolved provider/model pair selected by the router.
            context: Per-call runtime context such as timeout and request id.

        Returns:
            A normalized audio generation response.
        """
        raise AIUnsupportedCapabilityError(
            "Audio generation is not supported by this provider adapter",
            provider=model.provider,
            model=model.model_id,
        )
