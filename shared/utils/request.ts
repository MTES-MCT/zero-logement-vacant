import isMockFunction = jest.isMockFunction;
import fetchMock, {
  MockResponseInit,
  MockResponseInitFunction,
} from 'jest-fetch-mock';
import { Predicate } from '../../frontend/src/utils/compareUtils';

export interface RequestMatch {
  pathname: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
