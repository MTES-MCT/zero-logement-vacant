import { faker } from '@faker-js/faker/locale/fr';
import { feature, featureCollection, point } from '@turf/turf';
import type { FeatureCollection, Point } from 'geojson';
import { http, HttpResponse, RequestHandler } from 'msw';

const search = http.get<never, never, FeatureCollection<Point>>(
  'https://api-adresse.data.gouv.fr/search',
  async () => {
    const addresses: FeatureCollection<Point> = featureCollection(
      faker.helpers.multiple(() =>
        feature(
          point([faker.location.longitude(), faker.location.latitude()])
            .geometry,
          {
            banId: faker.string.uuid(),
            label: faker.location.streetAddress(),
            houseNumber: faker.location.buildingNumber(),
            street: faker.location.street(),
            postalCode: faker.location.zipCode(),
            city: faker.location.city(),
            score: faker.number.float({ min: 0, max: 1, multipleOf: 0.01 })
          }
        )
      )
    );

    return HttpResponse.json(addresses);
  }
);

export const banHandlers: RequestHandler[] = [search];
