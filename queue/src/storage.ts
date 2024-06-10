import { AsyncLocalStorage } from 'node:async_hooks';

export interface Store {
  establishment: string;
}

export const storage = new AsyncLocalStorage<Store>();
