import { EstablishmentApi } from '../models/EstablishmentApi';
import { AsyncLocalStorage } from 'node:async_hooks';

interface Store {
  establishment: EstablishmentApi;
}

export const auth = new AsyncLocalStorage<Store>();
