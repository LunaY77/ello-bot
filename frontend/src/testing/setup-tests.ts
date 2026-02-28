/**
 * Test Environment Configuration File
 *
 * Executes before all tests run, used to set up the test environment
 * Includes extended matchers for DOM testing utilities
 * Initializes MSW (Mock Service Worker) for API mocking
 */
import '@testing-library/jest-dom';

import { afterAll, afterEach, beforeAll } from 'vitest';

import {
  closeMockServer,
  initializeMockServer,
  resetMockServer,
} from './mocks';

// Initialize MSW server before all tests
beforeAll(() => {
  initializeMockServer();
});

// Reset handlers and database after each test
afterEach(() => {
  resetMockServer();
});

// Clean up after all tests
afterAll(() => {
  closeMockServer();
});
