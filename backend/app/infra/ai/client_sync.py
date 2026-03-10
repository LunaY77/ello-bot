"""Synchronous facade for the internal AI SDK."""

from __future__ import annotations

import asyncio
from functools import lru_cache

from .client import create_ai_client
from .requests import (
    AudioGenerateRequest,
    EmbeddingRequest,
    ImageGenerateRequest,
    TextGenerateRequest,
)
from .responses import (
    AudioGenerateResponse,
    EmbeddingResponse,
    ImageGenerateResponse,
    TextGenerateResponse,
)


def _ensure_not_in_event_loop() -> None:
    """Reject sync facade calls from active async contexts.

    Args:
        None.

    Returns:
        None.
    """
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return
    raise RuntimeError("AIClientSync cannot be used inside an active event loop")


class TextClientSync:
    """Expose blocking text generation operations."""

    def __init__(self, owner: AIClientSync) -> None:
        """Bind the sync sub-client to the root sync facade.

        Args:
            owner: Root sync facade that executes the underlying async calls.

        Returns:
            None.
        """
        self._owner = owner

    def generate(self, request: TextGenerateRequest) -> TextGenerateResponse:
        """Run text generation through a fresh async client instance.

        Args:
            request: Normalized SDK text generation request.

        Returns:
            A normalized text generation response.
        """
        return self._owner._run(lambda client: client.text.generate(request))


class EmbeddingClientSync:
    """Expose blocking embedding operations."""

    def __init__(self, owner: AIClientSync) -> None:
        """Bind the sync sub-client to the root sync facade.

        Args:
            owner: Root sync facade that executes the underlying async calls.

        Returns:
            None.
        """
        self._owner = owner

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Run embedding generation through a fresh async client instance.

        Args:
            request: Normalized SDK embedding request.

        Returns:
            A normalized embedding response.
        """
        return self._owner._run(lambda client: client.embedding.embed(request))


class ImageClientSync:
    """Expose blocking image generation operations."""

    def __init__(self, owner: AIClientSync) -> None:
        """Bind the sync sub-client to the root sync facade.

        Args:
            owner: Root sync facade that executes the underlying async calls.

        Returns:
            None.
        """
        self._owner = owner

    def generate(self, request: ImageGenerateRequest) -> ImageGenerateResponse:
        """Run image generation through a fresh async client instance.

        Args:
            request: Normalized SDK image generation request.

        Returns:
            A normalized image generation response.
        """
        return self._owner._run(lambda client: client.image.generate(request))


class AudioClientSync:
    """Expose blocking audio generation operations."""

    def __init__(self, owner: AIClientSync) -> None:
        """Bind the sync sub-client to the root sync facade.

        Args:
            owner: Root sync facade that executes the underlying async calls.

        Returns:
            None.
        """
        self._owner = owner

    def generate(self, request: AudioGenerateRequest) -> AudioGenerateResponse:
        """Run audio generation through a fresh async client instance.

        Args:
            request: Normalized SDK audio generation request.

        Returns:
            A normalized audio generation response.
        """
        return self._owner._run(lambda client: client.audio.generate(request))


class AIClientSync:
    """Provide a sync-only facade for scripts, CLI commands, and tests."""

    def __init__(self) -> None:
        """Initialize sub-clients for each AI modality.

        Args:
            None.

        Returns:
            None.
        """
        self.text = TextClientSync(self)
        self.embedding = EmbeddingClientSync(self)
        self.image = ImageClientSync(self)
        self.audio = AudioClientSync(self)

    def _run(self, operation):
        """Run one async SDK operation in a dedicated event loop.

        Args:
            operation: Callable that receives an async client and returns an awaitable.

        Returns:
            The result produced by the async SDK operation.
        """
        _ensure_not_in_event_loop()

        async def runner():
            """Create and dispose a fresh async client for one sync call.

            Args:
                None.

            Returns:
                The result produced by the async SDK operation.
            """
            client = create_ai_client()
            try:
                return await operation(client)
            finally:
                await client.aclose()

        return asyncio.run(runner())


@lru_cache
def get_ai_client_sync() -> AIClientSync:
    """Return the process-wide sync facade.

    Args:
        None.

    Returns:
        The shared sync AI client facade.
    """
    return AIClientSync()
