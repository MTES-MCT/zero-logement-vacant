import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import { housingTable } from './housingRepository';
import { establishmentsTable } from './establishmentRepository';

const logger = createLogger('geoStatisticsRepository');

export interface HousingCountByGeo {
  code: string;
  housingCount: number;
}

interface CountByDepartmentOptions {
  /** If undefined, returns statistics for all housings (France entière) */
  establishmentId?: string;
  regionCode?: string;
}

interface CountByCommuneOptions {
  /** If undefined, returns statistics for all housings (France entière) */
  establishmentId?: string;
  epciCode?: string;
}

/**
 * Count housings by department for an establishment
 * If no establishmentId provided, returns statistics for all housings (France entière)
 */
async function countByDepartment(
  options: CountByDepartmentOptions
): Promise<HousingCountByGeo[]> {
  logger.debug('Count housings by department', options);

  let query: string;
  let params: string[];

  if (options.establishmentId) {
    // Filter by establishment's geoCodes
    query = `
      SELECT
        SUBSTRING(fh.geo_code FROM 1 FOR 2) AS code,
        COUNT(*)::text AS housing_count
      FROM ${establishmentsTable} e
      JOIN ${housingTable} fh
        ON fh.geo_code = ANY(e.localities_geo_code)
      WHERE e.id = ?
      GROUP BY SUBSTRING(fh.geo_code FROM 1 FOR 2)
      ORDER BY housing_count DESC
    `;
    params = [options.establishmentId];
  } else {
    // France entière: count all housings by department
    query = `
      SELECT
        SUBSTRING(fh.geo_code FROM 1 FOR 2) AS code,
        COUNT(*)::text AS housing_count
      FROM ${housingTable} fh
      GROUP BY SUBSTRING(fh.geo_code FROM 1 FOR 2)
      ORDER BY housing_count DESC
    `;
    params = [];
  }

  const result = await db.raw<{ rows: { code: string; housing_count: string }[] }>(
    query,
    params
  );

  return result.rows.map((row) => ({
    code: row.code,
    housingCount: parseInt(row.housing_count, 10)
  }));
}

/**
 * Count housings by commune for an establishment, optionally filtered by EPCI
 */
async function countByCommune(
  options: CountByCommuneOptions
): Promise<HousingCountByGeo[]> {
  logger.debug('Count housings by commune', options);

  if (!options.establishmentId) {
    logger.warn('countByCommune called without establishmentId');
    return [];
  }

  let query = `
    SELECT
      fh.geo_code AS code,
      COUNT(*)::text AS housing_count
    FROM ${establishmentsTable} e
    JOIN ${housingTable} fh
      ON fh.geo_code = ANY(e.localities_geo_code)
    WHERE e.id = ?
  `;

  const params: string[] = [options.establishmentId];

  if (options.epciCode) {
    // We'll filter by EPCI codes provided by the controller
    // For now, we just return all communes
  }

  query += `
    GROUP BY fh.geo_code
    ORDER BY housing_count DESC
  `;

  const result = await db.raw<{ rows: { code: string; housing_count: string }[] }>(
    query,
    params
  );

  return result.rows.map((row) => ({
    code: row.code,
    housingCount: parseInt(row.housing_count, 10)
  }));
}

/**
 * Count housings by commune for specific geo codes
 * If no establishmentId provided, counts all housings in those geoCodes (France entière)
 */
async function countByCommuneInGeoCodes(
  establishmentId: string | undefined,
  geoCodes: string[]
): Promise<HousingCountByGeo[]> {
  logger.debug('Count housings by commune in geoCodes', { establishmentId, geoCodesCount: geoCodes.length });

  if (geoCodes.length === 0) {
    return [];
  }

  let query: string;
  let params: (string | string[])[];

  if (establishmentId) {
    // Filter by establishment's geoCodes AND the requested geoCodes
    query = `
      SELECT
        fh.geo_code AS code,
        COUNT(*)::text AS housing_count
      FROM ${establishmentsTable} e
      JOIN ${housingTable} fh
        ON fh.geo_code = ANY(e.localities_geo_code)
      WHERE e.id = ?
        AND fh.geo_code = ANY(?)
      GROUP BY fh.geo_code
      ORDER BY housing_count DESC
    `;
    params = [establishmentId, geoCodes];
  } else {
    // France entière: count all housings in the requested geoCodes
    query = `
      SELECT
        fh.geo_code AS code,
        COUNT(*)::text AS housing_count
      FROM ${housingTable} fh
      WHERE fh.geo_code = ANY(?)
      GROUP BY fh.geo_code
      ORDER BY housing_count DESC
    `;
    params = [geoCodes];
  }

  const result = await db.raw<{ rows: { code: string; housing_count: string }[] }>(
    query,
    params
  );

  return result.rows.map((row) => ({
    code: row.code,
    housingCount: parseInt(row.housing_count, 10)
  }));
}

export default {
  countByDepartment,
  countByCommune,
  countByCommuneInGeoCodes
};
