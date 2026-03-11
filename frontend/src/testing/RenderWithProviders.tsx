import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import {
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';

import { createTestQueryClient } from './query-client';

import i18n from '@/lib/i18n';

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
  route?: string;
};

/**
 * Render a React tree with the providers used by feature-level unit tests.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: ExtendedRenderOptions = {},
): RenderResult => {
  const {
    queryClient = createTestQueryClient(),
    route = '/',
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
};
