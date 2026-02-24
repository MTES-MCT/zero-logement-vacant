import { faker } from '@faker-js/faker/locale/fr';
import type {
  HousingBatchUpdatePayload,
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO,
  HousingPayloadDTO,
  HousingUpdatePayloadDTO,
  NoteDTO,
  Paginated
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Array, pipe, Predicate, Struct } from 'effect';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';
import qs from 'qs';
import { match } from 'ts-pattern';

import config from '../../utils/config';
import data from './data';

interface HousingQueryParams {
  campaignIds?: string;
  housingKinds?: string;
  relativeLocations?: string;
  status?: string;
  statusList?: string;
}

function parseQueryParams(url: URL): FilterParams {
  const params = qs.parse(url.search, {
    ignoreQueryPrefix: true
  }) as HousingQueryParams;

  const statusList = params.status
    ? [Number(params.status)]
    : params.statusList?.split(',').map(Number);

  return {
    campaignIds: params.campaignIds
      ? new Set(params.campaignIds.split(','))
      : undefined,
    housingKinds: params.housingKinds
      ? new Set(params.housingKinds.split(','))
      : undefined,
    relativeLocations: params.relativeLocations
      ? new Set(params.relativeLocations.split(','))
      : undefined,
    statuses: statusList ? new Set(statusList) : undefined
  };
}

const find = http.get<
  Record<string, never>,
  HousingPayload,
  Paginated<HousingDTO>
>(`${config.apiEndpoint}/api/housing`, async ({ request }) => {
  const url = new URL(request.url);
  const { campaignIds, housingKinds, relativeLocations, statuses } =
    parseQueryParams(url);

  const subset = pipe(
    data.housings,
    Array.map((housing) => {
      const mainHousingOwner =
        data.housingOwners
          .get(housing.id)
          ?.find((housingOwner) => housingOwner.rank === 1) ?? null;
      const mainOwner =
        data.owners.find((owner) => owner.id === mainHousingOwner?.id) ?? null;
      return {
        ...housing,
        owner: mainOwner
      };
    }),
    filter({ campaignIds, housingKinds, statuses, relativeLocations })
  );

  return HttpResponse.json({
    page: 1,
    perPage: 50,
    filteredCount: subset.length,
    totalCount: data.housings.length,
    entities: subset
  });
});

const count = http.get<Record<string, never>, HousingPayload, HousingCountDTO>(
  `${config.apiEndpoint}/api/housing/count`,
  async ({ request }) => {
    const url = new URL(request.url);
    const query = parseQueryParams(url);

    const subset: HousingDTO[] = pipe(data.housings, filter(query));

    const owners: number = pipe(
      subset,
      Array.flatMap((housing) => data.housingOwners.get(housing.id) ?? []),
      Array.dedupeWith((a, b) => a.id === b.id),
      Array.length
    );

    return HttpResponse.json({
      housing: subset.length,
      owners: owners
    });
  }
);

type HousingParams = {
  id: string;
};

type HousingPayload = {
  filters?: HousingFiltersDTO;
};

export const housingHandlers: RequestHandler[] = [
  find,
  count,

  // Add a housing
  http.post<never, HousingPayloadDTO, HousingDTO | Error>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      const payload = await request.json();
      const datafoncierHousing = data.datafoncierHousings.find(
        (datafoncierHousing) => datafoncierHousing.idlocal === payload.localId
      );
      if (!datafoncierHousing) {
        return HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${payload.localId} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const owner = genOwnerDTO();
      const housing: HousingDTO = {
        ...genHousingDTO(),
        localId: datafoncierHousing.idlocal,
        geoCode: datafoncierHousing.idcom,
        source: 'datafoncier-manual'
      };
      data.housings.push(housing);
      data.owners.push(owner);
      data.housingOwners.set(housing.id, [
        {
          id: owner.id,
          rank: 1,
          locprop: null,
          idprocpte: null,
          idprodroit: null,
          propertyRight: null,
          relativeLocation: null,
          absoluteDistance: null
        }
      ]);
      return HttpResponse.json(housing, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  // Bulk update housings
  http.put<never, HousingBatchUpdatePayload, ReadonlyArray<HousingDTO>>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      const payload = await request.json();

      // Get a random user, for now
      const user = faker.helpers.arrayElement(data.users) ?? genUserDTO();
      const housings = pipe(
        data.housings
        // TODO: apply filters here
      );
      const precisions = (payload.precisions ?? []).map((id) => {
        const precision = data.precisions.find(
          (precision) => precision.id === id
        );
        if (!precision) {
          throw new Error(`Precision ${id} missing`);
        }
        return precision;
      });
      const documents = (payload.documents ?? []).map((id) => {
        const document = data.documents.get(id) ?? null;
        if (!document) {
          throw new Error(`Document ${id} missing`);
        }
        return document;
      });

      housings.forEach((housing) => {
        housing.occupancy = payload.occupancy ?? housing.occupancy;
        housing.occupancyIntended =
          payload.occupancyIntended ?? housing.occupancyIntended;
        housing.status = payload.status ?? housing.status;
        housing.subStatus = payload.subStatus ?? housing.subStatus;

        if (payload.note) {
          const note: NoteDTO = {
            id: faker.string.uuid(),
            content: payload.note,
            createdAt: new Date().toJSON(),
            createdBy: user.id,
            creator: user,
            noteKind: 'Note courante',
            updatedAt: null
          };
          data.notes.push(note);
          const notes = (data.housingNotes.get(housing.id) ?? []).concat(
            note.id
          );
          data.housingNotes.set(housing.id, notes);
        }

        if (precisions.length) {
          data.housingPrecisions.set(
            housing.id,
            precisions.map((precision) => precision.id)
          );
        }

        if (documents.length) {
          data.housingDocuments.set(
            housing.id,
            documents.map(Struct.pick('id'))
          );
        }
      });

      return HttpResponse.json(housings);
    }
  ),
  // Get a housing by id
  http.get<HousingParams, never, HousingDTO | null | Error>(
    `${config.apiEndpoint}/api/housing/:id`,
    ({ params }) => {
      const housing = data.housings.find((housing) =>
        [housing.id, housing.localId].includes(params.id)
      );
      if (!housing) {
        return HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${params.id} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const mainHousingOwner = data.housingOwners
        .get(housing.id)
        ?.find((housingOwner) => housingOwner.rank === 1);
      const owner = data.owners.find(
        (owner) => owner.id === mainHousingOwner?.id
      );
      return HttpResponse.json({
        ...housing,
        owner: !owner
          ? null
          : Struct.pick(
              owner,
              'id',
              'idpersonne',
              'rawAddress',
              'fullName',
              'administrator',
              'birthDate',
              'email',
              'phone',
              'banAddress',
              'additionalAddress',
              'kind',
              'siren',
              'createdAt',
              'updatedAt'
            )
      });
    }
  ),

  // Update a housing
  http.put<HousingParams, HousingUpdatePayloadDTO, HousingDTO | Error>(
    `${config.apiEndpoint}/api/housing/:id`,
    async ({ params, request }) => {
      const payload = await request.json();
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${params.id} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const updated: HousingDTO = {
        ...housing,
        ...payload
      };
      data.housings = data.housings.map((housing) => {
        return housing.id === updated.id ? updated : housing;
      });

      return HttpResponse.json(updated);
    }
  )
];

export function filterByHousingIds(
  filters: Pick<HousingFiltersDTO, 'all' | 'housingIds'>
) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (filters.all && filters.housingIds?.length) {
      return housings.filter(
        (housing) => !filters.housingIds?.includes(housing.id)
      );
    }

    if (!filters.housingIds?.length) {
      return housings;
    }

    return housings.filter((housing) => {
      return filters.all
        ? !filters.housingIds?.includes(housing.id)
        : filters.housingIds?.includes(housing.id);
    });
  };
}

interface FilterParams {
  campaignIds?: Set<string>;
  housingKinds?: Set<string>;
  statuses?: Set<number>;
  relativeLocations?: Set<string>;
}

export function byCampaign(
  campaigns: Set<string>
): Predicate.Predicate<HousingDTO> {
  return (housing) =>
    !!data.housingCampaigns
      .get(housing.id)
      ?.some((campaign) => campaigns.has(campaign.id));
}

export function byKind(kinds: Set<string>): Predicate.Predicate<HousingDTO> {
  return (housing) => kinds.has(housing.housingKind);
}

export function byStatus(
  statuses: Set<number>
): Predicate.Predicate<HousingDTO> {
  return (housing) => statuses.has(housing.status);
}

export function byRelativeLocation(
  locations: Set<string>
): Predicate.Predicate<HousingDTO> {
  return (housing) => {
    const mainHousingOwner =
      data.housingOwners.get(housing.id)?.find((ho) => ho.rank === 1) ?? null;
    const relativeLocation = mainHousingOwner?.relativeLocation ?? null;
    return match(relativeLocation)
      .with(null, () => locations.has('other'))
      .with(
        'metropolitan',
        'overseas',
        (loc) => locations.has('other-region') || locations.has(loc)
      )
      .otherwise((loc) => locations.has(loc));
  };
}

export function filter(params: FilterParams) {
  const predicates: Predicate.Predicate<HousingDTO>[] = [
    params.campaignIds ? byCampaign(params.campaignIds) : null,
    params.housingKinds ? byKind(params.housingKinds) : null,
    params.statuses ? byStatus(params.statuses) : null,
    params.relativeLocations
      ? byRelativeLocation(params.relativeLocations)
      : null
  ].filter(Predicate.isNotNull);

  return (housings: HousingDTO[]): HousingDTO[] =>
    pipe(housings, Array.filter(Predicate.every(predicates)));
}
