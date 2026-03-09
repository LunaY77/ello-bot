"""
LLM Provider Abstract Base Class

Defines the interface that all concrete LLM provider implementations must satisfy.
Treat this like a database driver interface — the Agent framework depends only on
this abstraction, never on a specific provider (OpenAI, Anthropic, etc.).

Concrete implementations live outside this file and are injected via FastAPI DI.
"""

# from abc import ABC, abstractmethod


# class BaseLLMProvider(ABC):
#     """Abstract interface for LLM providers.

#     Implementors must provide both a plain-text ask() and a tool-capable ask_tool().
#     All methods are async to ensure non-blocking I/O.

#     Example usage inside an agent:
#         response = await self.llm.ask_tool(
#             messages=self.memory.messages,
#             tools=self.available_tools.to_params(),
#             tool_choice=ToolChoice.AUTO,
#         )
#     """
