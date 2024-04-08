import fetchMock from 'jest-fetch-mock';

import { createHttpService, getURLQuery, HttpMethod } from '../fetchUtils';
import authService from '../../services/auth.service';

describe('Fetch utils', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should prefix with the given host', async () => {
    const http = createHttpService('users', {
      host: 'https://api.example.com',
    });
    const mock = fetchMock.mockResponseOnce(() =>
      Promise.resolve({ status: 200 })
    );

    const { status } = await http.fetch('/users', {
      method: 'GET',
    });

    expect(status).toBe(200);
    expect(mock).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.anything()
    );
  });

  it('should send authentication headers', async () => {
    const http = createHttpService('users', {
      authenticated: true,
    });
    const mock = fetchMock.mockResponseOnce(() =>
      Promise.resolve({ status: 200 })
    );
    const authHeaders = {
      'x-access-token': 'access-token',
    };
    jest.spyOn(authService, 'authHeader').mockReturnValue(authHeaders);

    const { status } = await http.fetch('/users', {
      method: 'GET',
    });

    expect(status).toBe(200);
    expect(mock).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        headers: {
          'x-access-token': authHeaders['x-access-token'],
        },
      })
    );
  });

  it('should send Accept and Content-Type JSON headers', async () => {
    const http = createHttpService('users', {
      host: 'https://api.example.com',
      json: true,
    });
    const mock = fetchMock.mockResponseOnce(() =>
      Promise.resolve({ status: 200 })
    );

    const { status } = await http.fetch('/users', {
      method: 'GET',
    });

    expect(status).toBe(200);
    expect(mock).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

  methods.forEach((method) => {
    test(`should send a ${method} request`, async () => {
      const http = createHttpService('users');
      const mock = fetchMock.mockResponseOnce(() =>
        Promise.resolve({ status: 200 })
      );

      const verb = method.toLowerCase() as Lowercase<HttpMethod>;
      const { status } = await http[verb]('https://api.example.com/users');

      expect(status).toBe(200);
      expect(mock).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method,
        })
      );
    });
  });

  describe('getURLQuery', () => {
    it('should return a query string', () => {
      const actual = getURLQuery({
        string: 'string',
        number: 123,
        empty: '',
        array: ['a', 'b'],
        boolean: true,
        undefined: undefined,
        null: null,
      });

      expect(actual).toBe('?string=string&number=123&array=a%2Cb&boolean=true');
    });

    it('should return an empty query string if the given object is empty', () => {
      const actual = getURLQuery({});

      expect(actual).toBe('');
    });
  });
});
