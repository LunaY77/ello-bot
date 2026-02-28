import type { Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';

import '../src/index.css';
import i18n from '../src/lib/i18n';
import { queryConfig } from '../src/lib/react-query';

// Create a QueryClient instance for Storybook
const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <Story />
          </I18nextProvider>
        </QueryClientProvider>
      </BrowserRouter>
    ),
  ],
};

export default preview;
