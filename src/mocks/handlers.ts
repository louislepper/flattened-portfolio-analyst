import { http, HttpResponse } from 'msw';
import { SECURITY_ENDPOINT } from '../api/endpoints';
import { MOCK_SECURITIES } from './fixtures';

export const handlers = [
  http.get(
    `${SECURITY_ENDPOINT}/:ticker`,
    ({ params }) => {
      const ticker = (params.ticker as string).toUpperCase();
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
