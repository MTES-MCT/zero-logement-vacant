import { FetchMock } from 'jest-fetch-mock';

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
