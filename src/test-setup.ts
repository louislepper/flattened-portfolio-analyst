import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// ResponsiveContainer uses ResizeObserver to get dimensions; JSDOM has none.
// Provide a stub that immediately reports an 800px-wide container.
global.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) { this.cb = cb; }
  observe(target: Element) {
    this.cb(
      [{ contentRect: { width: 800, height: 500 } } as ResizeObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
