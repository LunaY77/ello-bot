import '@testing-library/jest-dom';

import { afterAll, afterEach, beforeAll, vi } from 'vitest';

const NETWORK_ERROR_MESSAGE =
  'Network access is disabled in Vitest. Use Playwright with the real backend for HTTP-dependent flows.';

class BlockedXMLHttpRequest {
  abort() {}

  addEventListener() {}

  dispatchEvent() {
    return false;
  }

  getAllResponseHeaders() {
    return '';
  }

  getResponseHeader() {
    return null;
  }

  open() {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  overrideMimeType() {}

  removeEventListener() {}

  send() {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  setRequestHeader() {}
}

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }) as typeof fetch,
  );
  vi.stubGlobal(
    'XMLHttpRequest',
    BlockedXMLHttpRequest as unknown as typeof XMLHttpRequest,
  );
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});
