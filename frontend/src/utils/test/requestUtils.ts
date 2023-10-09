import fetchMock, {
  FetchMock,
  MockResponseInit,
  MockResponseInitFunction,
} from 'jest-fetch-mock';
import { Predicate } from '../compareUtils';
import isMockFunction = jest.isMockFunction;

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

interface Match {
  pathname: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  response: MockResponseInitFunction | MockResponseInit;
}

export const mockRequests = (matches: Match[]): void => {
  function predicates(match: Match): Predicate<Request>[] {
    return [
      (request) => request.url.endsWith(match.pathname),
      (request) => (match.method ? request.method === match.method : true),
      // Add predicates here to match more request properties
    ];
  }

  fetchMock.mockResponse((request): Promise<MockResponseInit | string> => {
    const match = matches.find((match) => {
      return predicates(match).every((predicate) => predicate(request));
    });
    if (!match) {
      throw new Error('Request must be mocked');
    }

    return isMockResponseInitFunction(match.response)
      ? match.response(request)
      : Promise.resolve(match.response);
  });
};

const isMockResponseInitFunction = (
  response: unknown
): response is MockResponseInitFunction => isMockFunction(response);
