"""Routing logic for resolving requests into concrete execution routes."""

from __future__ import annotations

from .exceptions import AIUnsupportedCapabilityError
from .registry import ModelRegistry
from .requests import AIRequest
from .types import AICapability, ResolvedModel


class AIRouter:
    """Resolve SDK requests into one concrete provider/model route."""

    def __init__(self, registry: ModelRegistry) -> None:
        """Bind the router to a model registry.

        Args:
            registry: Shared model registry used to resolve providers and models.

        Returns:
            None.
        """
        self._registry = registry

    def resolve(
        self,
        *,
        request: AIRequest,
        capability: AICapability,
        require_stream: bool = False,
    ) -> ResolvedModel:
        """Resolve one request into a single concrete route.

        Args:
            request: SDK request that already carries business-selected provider and model.
            capability: Capability required by the current operation.
            require_stream: Whether the route must support streaming.

        Returns:
            The resolved execution route for the request.
        """
        resolved = self._registry.resolve(
            provider=request.provider,
            model=request.model,
            capability=capability,
        )

        if require_stream and not resolved.spec.supports_stream:
            raise AIUnsupportedCapabilityError(
                f"Model '{request.model}' does not support streaming",
                provider=resolved.provider,
                model=resolved.model_id,
            )

        return resolved
