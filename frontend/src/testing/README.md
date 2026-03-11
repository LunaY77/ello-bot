# Frontend Unit Test Utilities

This directory now contains helpers for pure frontend unit and component tests.

## Principles

- Vitest is reserved for isolated frontend behavior.
- Real HTTP flows belong in Playwright against the real backend.
- Network access is blocked in `setup-tests.ts` so HTTP-dependent cases fail fast.

## Directory Structure

```text
src/testing/
├── query-client.ts           # Deterministic QueryClient factory for tests
├── RenderWithProviders.tsx   # Router + Query + i18n wrapper
└── setup-tests.ts            # jest-dom + no-network test guardrails
```

## Usage

```tsx
import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/testing/RenderWithProviders';

renderWithProviders(<MyComponent />);

expect(screen.getByText('Hello')).toBeVisible();
```
