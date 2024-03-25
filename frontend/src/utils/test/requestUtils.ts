import fetchMock, {
  FetchMock,
  MockResponseInit,
  MockResponseInitFunction,
} from 'jest-fetch-mock';
import { Predicate } from '../compareUtils';
import { not } from '../../../../shared';

export interface RequestCall {
  url: string;
  body: any;
}

export const getRequestCalls = (fetchMock: FetchMock) =>
  Promise.all(
    fetchMock.mock.calls.map(async (call) => {
      const request = call[0] as Request;
      if (request.url && request.body) {
        const body = await request.json();
        return {
          url: request.url,
          method: request.method,
          body,
        };
      }
    })
  );

export interface RequestMatch {
  pathname: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  persist?: boolean;
  response: MockResponseInitFunction | MockResponseInit;
}

export const mockRequests = (matches: RequestMatch[]): void => {
  function predicates(match: RequestMatch): Predicate<Request>[] {
    return [
      (request) => request.url.endsWith(match.pathname),
      (request) => (match.method ? request.method === match.method : true),
      // Add predicates here to match more request properties
    ];
  }

  const consumed = new Set<RequestMatch>();
  function isConsumed(match: RequestMatch): boolean {
    return consumed.has(match);
  }

  fetchMock.mockResponse((request): Promise<MockResponseInit | string> => {
    const match = matches.filter(not(isConsumed)).find((match) => {
      return predicates(match).every((predicate) => predicate(request));
    });
    if (!match) {
      const error = new MockError(request);
      console.error(error);
      return Promise.reject(error);
    }

    if (!match.persist) {
      consumed.add(match);
    }

    return isMockResponseInitFunction(match.response)
      ? match.response(request)
      : Promise.resolve(match.response);
  });
};

const isMockResponseInitFunction = (
  response: unknown
): response is MockResponseInitFunction => typeof response === 'function';

class MockError extends Error {
  constructor(request: Request) {
    super(`Request to ${request.method} ${request.url} must be mocked`);
    this.name = 'MockError';
  }
}
