interface HttpServiceOptions {
  host?: string;
}

interface HttpService {
  name: string;
  fetch(input: string, init: RequestOptions): ReturnType<typeof fetch>;
}

interface RequestOptions extends Omit<RequestInit, 'signal'> {
  abortId?: string;
}

export function createHttpService(
  name: string,
  options?: HttpServiceOptions
): HttpService {
  return {
    name,
    fetch: (input, init) => {
      return fetch(input, {
        ...init,
        signal: init.abortId ? allowAbort(init.abortId) : undefined,
      });
    },
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
