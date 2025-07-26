import { faker } from '@faker-js/faker/locale/fr';
import { http, HttpResponse, RequestHandler } from 'msw';
import { Address } from '~/models/Address';

export const banHandlers: RequestHandler[] = [
  http.get<never, never, ReadonlyArray<Address>>(
    'https://api-adresse.data.gouv.fr/search',
    async () => {
      const addresses: ReadonlyArray<Address> = [
        {
          label: faker.location.streetAddress(),
          banId: faker.string.uuid(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
          score: faker.number.float({ min: 0, max: 1 }),
          postalCode: faker.location.zipCode(),
          city: faker.location.city()
        }
      ];
      return HttpResponse.json(addresses);
    }
  )
];
