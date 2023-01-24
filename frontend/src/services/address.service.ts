import config from '../utils/config';

export interface AddressSearchResult {
  label: string;
  geoCode: string;
}

const quickSearchService = (): {
  abort: () => void;
  fetch: (query: string) => Promise<AddressSearchResult[]>;
} => {
  const controller = new AbortController();
  const signal = controller.signal;

  return {
    abort: () => controller.abort(),
    fetch: (query: string) =>
      fetch(`${config.banEndpoint}/search/?q=${query}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      })
        .then((_) => _.json())
        .then((result) =>
          result.features.map(
            (a: any) =>
              ({
                label: a.properties.label,
                geoCode: a.properties.citycode,
              } as AddressSearchResult)
          )
        ),
  };
};

const housingService = {
  quickSearchService,
};

export default housingService;
