"""Model and provider registry for the internal AI SDK."""

from __future__ import annotations

from collections.abc import Iterable

from .config import AISettings
from .exceptions import AIConfigError, AIUnsupportedCapabilityError, AIValidationError
from .types import AICapability, AIModality, ModelSpec, ProviderConfig, ResolvedModel

_OPENAI_BASE_URL = "https://api.openai.com/v1"
_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"
_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


def _default_input_modalities(capability: AICapability) -> tuple[AIModality, ...]:
    """Return default input modalities for ad-hoc model resolution.

    Args:
        capability: Capability requested by the caller.

    Returns:
        The default input modality tuple for the capability.
    """
    return (AIModality.TEXT,)


def _default_output_modalities(capability: AICapability) -> tuple[AIModality, ...]:
    """Return default output modalities for ad-hoc model resolution.

    Args:
        capability: Capability requested by the caller.

    Returns:
        The default output modality tuple for the capability.
    """
    if capability is AICapability.IMAGE_GENERATION:
        return (AIModality.IMAGE,)
    if capability is AICapability.AUDIO_GENERATION:
        return (AIModality.AUDIO,)
    return (AIModality.TEXT,)


class ModelRegistry:
    """Store provider runtime configuration and optional model capability metadata."""

    def __init__(
        self,
        *,
        models: Iterable[ModelSpec] | None = None,
        providers: Iterable[ProviderConfig] | None = None,
    ) -> None:
        """Initialize the registry with optional providers and models.

        Args:
            models: Optional iterable of model specs to register immediately.
            providers: Optional iterable of provider configs to register immediately.

        Returns:
            None.
        """
        self._models_by_alias: dict[str, ModelSpec] = {}
        self._models_by_provider: dict[tuple[str, str], ModelSpec] = {}
        self._providers: dict[str, ProviderConfig] = {}

        for provider in providers or ():
            self.register_provider(provider)

        for model in models or ():
            self.register_model(model)

    def register_provider(self, provider: ProviderConfig) -> None:
        """Register or replace one provider runtime configuration.

        Args:
            provider: Provider runtime configuration to store.

        Returns:
            None.
        """
        self._providers[provider.name] = provider

    def register_model(self, spec: ModelSpec) -> None:
        """Register one concrete provider model with optional metadata.

        Args:
            spec: Concrete model spec to store in the registry.

        Returns:
            None.
        """
        if spec.alias in self._models_by_alias:
            raise AIConfigError(f"Duplicate model alias registered: {spec.alias}")

        identity = (spec.provider, spec.model_id)
        if identity in self._models_by_provider:
            raise AIConfigError(
                f"Duplicate model registered for provider '{spec.provider}' and model '{spec.model_id}'"
            )

        self._models_by_alias[spec.alias] = spec
        self._models_by_provider[identity] = spec

    def resolve(
        self,
        *,
        provider: str,
        model: str,
        capability: AICapability,
    ) -> ResolvedModel:
        """Resolve one provider/model pair into runtime configuration.

        Args:
            provider: Provider selected by the caller or upstream policy layer.
            model: Concrete provider model id selected by the caller.
            capability: Capability required by the current operation.

        Returns:
            The resolved model and provider configuration pair.
        """
        provider_config = self._providers.get(provider)
        if provider_config is None:
            raise AIValidationError(f"Unknown AI provider: {provider}")

        spec = self._models_by_provider.get((provider, model))
        if spec is None:
            # Business code may choose models dynamically. When no catalog entry is
            # registered, the SDK still routes the request while preserving a stable
            # capability envelope for downstream adapters and telemetry.
            spec = ModelSpec(
                alias=f"{provider}:{model}",
                provider=provider,
                model_id=model,
                capabilities=(capability,),
                input_modalities=_default_input_modalities(capability),
                output_modalities=_default_output_modalities(capability),
                supports_stream=capability is AICapability.TEXT_GENERATION,
            )

        if not spec.supports(capability):
            raise AIUnsupportedCapabilityError(
                f"Model '{model}' does not support capability '{capability.value}'",
                provider=provider,
                model=model,
            )

        return ResolvedModel(spec=spec, provider_config=provider_config)

    def list_models(self) -> tuple[ModelSpec, ...]:
        """Return all registered model specs.

        Args:
            None.

        Returns:
            A tuple containing every registered model spec.
        """
        return tuple(self._models_by_alias.values())

    def list_providers(self) -> tuple[ProviderConfig, ...]:
        """Return all registered provider runtime configurations.

        Args:
            None.

        Returns:
            A tuple containing every registered provider configuration.
        """
        return tuple(self._providers.values())


def build_default_registry(settings: AISettings) -> ModelRegistry:
    """Create the default registry from application settings.

    Args:
        settings: AI SDK configuration loaded from application settings.

    Returns:
        A populated model registry with provider runtime configuration.
    """
    technical_retry_count = max(settings.technical_retry_count, 0)
    technical_retry_backoff_ms = max(settings.technical_retry_backoff_ms, 0)
    default_timeout_ms = max(settings.default_timeout_ms, 1)

    providers = (
        ProviderConfig(
            name="openai",
            api_key=settings.openai.api_key or None,
            base_url=settings.openai.base_url or _OPENAI_BASE_URL,
            timeout_ms=default_timeout_ms,
            max_retries=technical_retry_count,
            backoff_base_ms=technical_retry_backoff_ms,
        ),
        ProviderConfig(
            name="anthropic",
            api_key=settings.anthropic.api_key or None,
            base_url=settings.anthropic.base_url or _ANTHROPIC_BASE_URL,
            timeout_ms=default_timeout_ms,
            max_retries=technical_retry_count,
            backoff_base_ms=technical_retry_backoff_ms,
            default_headers={"anthropic-version": settings.anthropic.api_version},
        ),
        ProviderConfig(
            name="gemini",
            api_key=settings.gemini.api_key or None,
            base_url=settings.gemini.base_url or _GEMINI_BASE_URL,
            timeout_ms=default_timeout_ms,
            max_retries=technical_retry_count,
            backoff_base_ms=technical_retry_backoff_ms,
        ),
    )

    return ModelRegistry(providers=providers)
