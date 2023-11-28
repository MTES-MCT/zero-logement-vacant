import highland from 'highland';
import { Knex } from 'knex';

import db, { getCurrentTransaction, likeUnaccent } from './db';
import { EstablishmentApi } from '../models/EstablishmentApi';
import { EstablishmentFilterApi } from '../models/EstablishmentFilterApi';
import { logger } from '../utils/logger';

export const establishmentsTable = 'establishments';
export const Establishments = () => {
  const transaction = getCurrentTransaction()?.transaction ?? db;
  return transaction<EstablishmentDbo>(establishmentsTable);
};

type FindOptions = Partial<EstablishmentFilterApi>;

const find = async (opts?: FindOptions): Promise<EstablishmentApi[]> => {
  const establishments: EstablishmentDbo[] = await db<EstablishmentDbo>(
    establishmentsTable
  )
    .modify(filter(opts))
    .orderBy('name');

  return establishments.map(parseEstablishmentApi);
};

function filter(filters?: EstablishmentFilterApi) {
  return (builder: Knex.QueryBuilder<EstablishmentDbo>) => {
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

  const result = await db(establishmentsTable)
    .from(establishmentsTable)
    .where(`${establishmentsTable}.siren`, options.siren)
    .first();

  return result ? parseEstablishmentApi(result) : null;
};

const update = async (establishmentApi: EstablishmentApi): Promise<void> => {
  await db<EstablishmentDbo>(establishmentsTable)
    .where('id', establishmentApi.id)
    .update(formatEstablishmentApi(establishmentApi));
};

interface StreamOptions {
  updatedAfter?: Date;
}

const stream = (options?: StreamOptions) => {
  const stream = db(establishmentsTable)
    .orderBy('name')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
    })
    .stream();
  return highland<EstablishmentDbo>(stream).map(parseEstablishmentApi);
};

export interface EstablishmentDbo {
  id: string;
  name: string;
  siren: number;
  available: boolean;
  localities_geo_code: string[];
  campaign_intent?: string;
  priority?: string;
  kind: string;
  updated_at: Date;
}

export const formatEstablishmentApi = (
  establishmentApi: EstablishmentApi
): EstablishmentDbo => ({
  id: establishmentApi.id,
  name: establishmentApi.name,
  siren: establishmentApi.siren,
  available: establishmentApi.available,
  localities_geo_code: establishmentApi.geoCodes,
  campaign_intent: establishmentApi.campaignIntent,
  priority: establishmentApi.priority,
  kind: establishmentApi.kind,
  updated_at: new Date(),
});

export const parseEstablishmentApi = (
  establishmentDbo: EstablishmentDbo
): EstablishmentApi =>
  <EstablishmentApi>{
    id: establishmentDbo.id,
    name: establishmentDbo.name,
    shortName:
      establishmentDbo.kind === 'Commune'
        ? establishmentDbo.name.replaceAll(/^Commune d(e\s|')/g, '')
        : establishmentDbo.name,
    siren: establishmentDbo.siren,
    available: establishmentDbo.available,
    geoCodes: establishmentDbo.localities_geo_code,
    campaignIntent: establishmentDbo.campaign_intent,
    priority: establishmentDbo.priority ?? 'standard',
    kind: establishmentDbo.kind,
  };

export default {
  find,
  get,
  findOne,
  update,
  stream,
  formatEstablishmentApi,
};
