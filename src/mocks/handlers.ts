import { delay, http, HttpResponse } from 'msw';
import { SECURITY_ENDPOINT } from '../api/endpoints';
import { MOCK_SECURITIES } from './fixtures';

// Fixture tickers that simulate a slow backend and a persistent 503.
export const SLOW_MOCK_TICKER = 'SLOWCO';
export const FAILING_MOCK_TICKER = 'FLAKYCO';
const SLOW_RESPONSE_MS = 4000;

export const handlers = [
  http.get(
    `${SECURITY_ENDPOINT}/:ticker`,
    async ({ params }) => {
      const ticker = (params.ticker as string).toUpperCase();
      if (ticker === FAILING_MOCK_TICKER) {
        return HttpResponse.json(
          { error: 'INTERNAL', message: 'Service unavailable' },
          { status: 503 },
        );
      }
      if (ticker === SLOW_MOCK_TICKER) {
        await delay(SLOW_RESPONSE_MS);
      }
      const security = MOCK_SECURITIES[ticker];

      if (!security) {
        return HttpResponse.json(
          {
            error: 'NOT_FOUND',
            message: `Security not found`,
          },
          { status: 404 },
        );
      }

      return HttpResponse.json(security);
    },
  ),
];
