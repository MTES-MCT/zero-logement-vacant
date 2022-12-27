import config from '../utils/config';
import authService from './auth.service';
import { Establishment } from '../models/Establishment';

const listAvailableEstablishments = async (): Promise<Establishment[]> => {
  return await fetch(`${config.apiEndpoint}/api/establishments/available`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const quickSearchService = (): {
  abort: () => void;
  fetch: (query: string) => Promise<Establishment[]>;
} => {
  const controller = new AbortController();
  const signal = controller.signal;

  return {
    abort: () => controller.abort(),
    fetch: (query: string) =>
      fetch(
        `${config.apiEndpoint}/api/establishments${query ? `?q=${query}` : ''}`,
        {
          method: 'GET',
          signal,
        }
      ).then((_) => _.json()),
  };
};

const establishmentService = {
  listAvailableEstablishments,
  quickSearchService,
};

export default establishmentService;
