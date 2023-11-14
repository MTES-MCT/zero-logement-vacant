import { kebabCase } from 'lodash';

import authService from '../services/auth.service';

interface HttpService {
  name: string;
  fetch(input: string, init?: RequestOptions): ReturnType<typeof fetch>;
  get(input: string, init?: RequestOptions): ReturnType<typeof fetch>;
  post(input: string, init?: RequestOptions): ReturnType<typeof fetch>;
  put(input: string, init?: RequestOptions): ReturnType<typeof fetch>;
  delete(input: string, init?: RequestOptions): ReturnType<typeof fetch>;
}

interface RequestOptions extends Omit<RequestInit, 'signal'> {
  abortId?: string;
}

interface HttpOptions {
  authenticated?: boolean;
  host?: string;
  json?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export function createHttpService(
  name: string,
  options?: HttpOptions
): HttpService {
  function doFetch(method?: HttpMethod) {
    return (input: string, init?: RequestOptions): Promise<Response> => {
      const authHeaders: Record<string, string> = options?.authenticated
        ? authService.authHeader() ?? {}
        : {};
      const jsonHeaders: Record<string, string> = options?.json
        ? {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          }
        : {};

      const uri = options?.host ? `${options.host}${input}` : input;
      return fetch(uri, {
        ...init,
        method: method ?? init?.method,
        headers: {
          ...authHeaders,
          ...jsonHeaders,
          ...init?.headers,
        },
        signal: init?.abortId ? allowAbort(init.abortId) : undefined,
      });
    };
  }

  return {
    name,
    fetch: doFetch(),
    get: doFetch('GET'),
    post: doFetch('POST'),
    put: doFetch('PUT'),
    delete: doFetch('DELETE'),
  };
}

const ABORT_CONTROLLERS = new Map<string, AbortController>();

function allowAbort(id: string): AbortSignal {
  abortSafely(id);
  const abortController = new AbortController();
  ABORT_CONTROLLERS.set(id, abortController);
  return abortController.signal;
}

function abortSafely(id: string): void {
  const controller = ABORT_CONTROLLERS.get(id);
  controller?.abort();
}

export function handleAbort(error: Error) {
  if (error.name !== 'AbortError') {
    throw error;
  }
}

export function toJSON(response: Response): any {
  return response.json();
}

export interface AbortOptions {
  abortable?: boolean;
}

export const getURLQuery = (params: Object) => {
  const searchParams: URLSearchParams = new URLSearchParams(
    Object.entries(params).filter(
      ([_, v]) => v !== undefined && !(v instanceof Array)
    )
  );

  Object.entries(params)
    .filter(([_, v]) => v instanceof Array && v.length)
    .forEach(([k, v]) => {
      (v as Array<string>).forEach((_) => searchParams.append(k, _));
    });

  return searchParams.toString() !== '' ? `?${searchParams}` : '';
};

export const normalizeUrlSegment = (segment: string) =>
  kebabCase(segment.replaceAll(/\(.*\)/g, ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export interface AbortOptions {
  abortable?: boolean;
}
