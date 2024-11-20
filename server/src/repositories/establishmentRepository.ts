import highland from 'highland';
import { Knex } from 'knex';

import {
  EstablishmentKind,
  EstablishmentSource
} from '@zerologementvacant/models';
import db, { likeUnaccent } from '~/infra/database';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { EstablishmentFilterApi } from '~/models/EstablishmentFilterApi';
import { logger } from '~/infra/logger';

export const establishmentsTable = 'establishments';
export const Establishments = (transaction = db) =>
  transaction<EstablishmentDBO>(establishmentsTable);

type FindOptions = Partial<EstablishmentFilterApi>;

const find = async (opts?: FindOptions): Promise<EstablishmentApi[]> => {
  const establishments: EstablishmentDBO[] = await Establishments()
    .modify(filter(opts))
    .orderBy('name');

  return establishments.map(parseEstablishmentApi);
};

function filter(filters?: EstablishmentFilterApi) {
  return (builder: Knex.QueryBuilder<EstablishmentDBO>) => {
    if (filters?.ids) {
      builder.whereIn('id', filters.ids);
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
      builder.where('kind', filters.kind);
    }
    if (filters?.name) {
      builder.whereRaw(
        `lower(unaccent(regexp_replace(regexp_replace(name, '''| [(].*[)]', '', 'g'), ' | - ', '-', 'g'))) like '%' || ?`,
        filters?.name
      );
    }
    if (filters?.sirens) {
      builder.whereIn('siren', filters.sirens);
    }
  };
}

const get = async (id: string): Promise<EstablishmentApi | null> => {
  logger.debug('Get establishment by id', id);

  const establishment = await Establishments()
    .where(`${establishmentsTable}.id`, id)
    .first();

  return establishment ? parseEstablishmentApi(establishment) : null;
};

interface FindOneOptions {
  siren?: number;
}

const findOne = async (
  options: FindOneOptions
): Promise<EstablishmentApi | null> => {
  logger.info('Find establishment by', options);

  const result = await Establishments()
    .from(establishmentsTable)
    .where(`${establishmentsTable}.siren`, options.siren)
    .first();

  return result ? parseEstablishmentApi(result) : null;
};

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

const stream = (options?: StreamOptions) => {
  const stream = Establishments()
    .orderBy('name')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
    })
    .stream();
  return highland<EstablishmentDBO>(stream).map(parseEstablishmentApi);
};

const save = async (establishment: EstablishmentDBO): Promise<void> => {
  logger.debug('Saving establishment...', {
    establishment
  });

  await Establishments().insert(establishment);
  logger.info('Saved establishment', { establishment: establishment.id });
};

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
  siren: establishment.siren,
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
  siren: establishment.siren,
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
