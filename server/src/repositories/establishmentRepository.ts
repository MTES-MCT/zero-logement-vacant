import highland from 'highland';
import { Knex } from 'knex';

import {
  EstablishmentFiltersDTO,
  EstablishmentKind,
  EstablishmentSource
} from '@zerologementvacant/models';
import db, { likeUnaccent } from '~/infra/database';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { createLogger } from '~/infra/logger';

export const establishmentsTable = 'establishments';
export const Establishments = (transaction = db) =>
  transaction<EstablishmentDBO>(establishmentsTable);

const logger = createLogger('establishmentRepository');

type FindOptions = {
  filters?: EstablishmentFiltersDTO;
};

async function find(
  opts?: FindOptions
): Promise<ReadonlyArray<EstablishmentApi>> {
  logger.debug('Find establishments', opts);

  const establishments: EstablishmentDBO[] = await Establishments()
    .modify(filter(opts?.filters))
    .orderBy('name');

  return establishments.map(parseEstablishmentApi);
}

async function get(id: string): Promise<EstablishmentApi | null> {
  logger.debug('Get establishment', { id });

  const establishment = await Establishments()
    .where(`${establishmentsTable}.id`, id)
    .first();

  return establishment ? parseEstablishmentApi(establishment) : null;
}

interface FindOneOptions {
  siren?: number;
}

async function findOne(
  options: FindOneOptions
): Promise<EstablishmentApi | null> {
  logger.info('Find establishment by', options);

  const result = await Establishments()
    .from(establishmentsTable)
    .where(`${establishmentsTable}.siren`, options.siren)
    .first();

  return result ? parseEstablishmentApi(result) : null;
}

async function update(establishmentApi: EstablishmentApi): Promise<void> {
  await Establishments()
    .where('id', establishmentApi.id)
    .update(formatEstablishmentApi(establishmentApi));
}

async function setAvailable(establishment: EstablishmentApi): Promise<void> {
  await Establishments()
    .where({ id: establishment.id })
    .update({ available: true });
}

interface StreamOptions {
  updatedAfter?: Date;
}

async function stream(options?: StreamOptions) {
  const stream = Establishments()
    .orderBy('name')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
    })
    .stream();
  return highland<EstablishmentDBO>(stream).map(parseEstablishmentApi);
}

async function save(establishment: EstablishmentDBO): Promise<void> {
  logger.debug('Saving establishment...', {
    establishment
  });

  await Establishments().insert(establishment);
  logger.info('Saved establishment', { establishment: establishment.id });
}

function filter(filters?: EstablishmentFiltersDTO) {
  return (builder: Knex.QueryBuilder<EstablishmentDBO>) => {
    if (filters?.id) {
      builder.whereIn('id', filters.id);
    }
    if (filters?.available) {
      builder.where('available', true);
    }
    if (filters?.query?.length) {
      builder.whereRaw(likeUnaccent('name', filters.query));
    }
    if (filters?.geoCodes) {
      builder.whereRaw('? && localities_geo_code', [filters.geoCodes]);
    }
    if (filters?.kind) {
      builder.whereIn('kind', filters.kind);
    }
    if (filters?.name) {
      builder.whereRaw(
        `lower(unaccent(regexp_replace(regexp_replace(name, '''| [(].*[)]', '', 'g'), ' | - ', '-', 'g'))) like '%' || ?`,
        filters?.name
      );
    }
    if (filters?.siren) {
      builder.whereIn('siren', filters.siren);
    }
  };
}

export interface EstablishmentDBO {
  id: string;
  name: string;
  siren: number;
  available: boolean;
  localities_geo_code: string[];
  kind: EstablishmentKind;
  source: EstablishmentSource;
  updated_at: Date;
}

export const formatEstablishmentApi = (
  establishment: EstablishmentApi
): EstablishmentDBO => ({
  id: establishment.id,
  name: establishment.name,
  siren: Number(establishment.siren),
  available: establishment.available,
  localities_geo_code: establishment.geoCodes,
  kind: establishment.kind,
  updated_at: new Date(),
  source: establishment.source
});

export const parseEstablishmentApi = (
  establishment: EstablishmentDBO
): EstablishmentApi => ({
  id: establishment.id,
  name: establishment.name,
  shortName:
    establishment.kind === 'Commune'
      ? establishment.name.replaceAll(/^Commune d(e\s|')/g, '')
      : establishment.name,
  siren: establishment.siren.toString(),
  available: establishment.available,
  geoCodes: establishment.localities_geo_code,
  kind: establishment.kind,
  source: establishment.source
});

export default {
  find,
  get,
  findOne,
  update,
  setAvailable,
  stream,
  formatEstablishmentApi,
  save
};
