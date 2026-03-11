"""Internal AI SDK package.

Import concrete modules directly, for example:

- ``from app.infra.ai.client import get_ai_client``
- ``from app.infra.ai.requests import TextGenerateRequest, TextMessage``
- ``from app.infra.ai.config import AISettings``

Keeping the package root lightweight avoids import cycles with ``app.core`` and
gives IDEs direct symbol resolution.
"""
