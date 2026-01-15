import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { query } from 'express-validator';
import { constants } from 'http2';

import {
  GeoLevel,
  GeoStatisticsDTO,
  GeoStatisticsResponseDTO,
  UserRole
} from '@zerologementvacant/models';
import ForbiddenError from '~/errors/forbiddenError';
import { createLogger } from '~/infra/logger';
import establishmentRepository from '~/repositories/establishmentRepository';
import geoStatisticsRepository from '~/repositories/geoStatisticsRepository';
import geoAPI from '~/services/geo/geo-api';

const logger = createLogger('geoStatisticsController');

/**
 * Mapping of department codes to region codes
 * This is cached after first fetch from geo.api.gouv.fr
 */
let departmentToRegionMap: Map<string, string> | null = null;
let regionNamesMap: Map<string, string> | null = null;
let departmentNamesMap: Map<string, string> | null = null;

async function initializeMappings(): Promise<void> {
  if (departmentToRegionMap && regionNamesMap && departmentNamesMap) {
    return;
  }

  const [regions, departments] = await Promise.all([
    geoAPI.getRegions(),
    geoAPI.getDepartments()
  ]);

  regionNamesMap = new Map(regions.map((r) => [r.code, r.nom]));
  departmentNamesMap = new Map(departments.map((d) => [d.code, d.nom]));
  departmentToRegionMap = new Map(departments.map((d) => [d.code, d.codeRegion]));
}

const getStatisticsValidators = [
  query('level')
    .isIn(['region', 'department', 'epci'])
    .withMessage('level must be one of: region, department, epci'),
  query('code')
    .optional()
    .isString()
    .withMessage('code must be a string'),
  query('establishmentId')
    .optional()
    .isUUID()
    .withMessage('establishmentId must be a valid UUID')
];

/**
 * GET /api/geo/statistics
 *
 * Get housing count statistics aggregated by geographic level.
 *
 * Query parameters:
 * - level: 'region' | 'department' | 'epci' (required)
 * - code: geographic code to filter by parent level (optional)
 *   - For level=department: region code to filter departments
 *   - For level=epci: department code to filter EPCIs
 * - establishmentId: establishment ID to query (optional, admin only)
 *
 * Security:
 * - Regular users: can only query their own establishment
 * - Admins: can query any establishment via establishmentId parameter
 * - All filter codes must be within the user's establishment perimeter
 */
async function getStatistics(request: Request, response: Response) {
  const { auth, user } = request as AuthenticatedRequest;
  const level = request.query.level as GeoLevel;
  const code = request.query.code as string | undefined;
  const requestedEstablishmentId = request.query.establishmentId as string | undefined;

  const isAdmin = user.role === UserRole.ADMIN;

  // Determine which establishment to query
  // undefined = France entière (no establishment filter)
  let targetEstablishmentId: string | undefined;

  if (requestedEstablishmentId) {
    // Admin can query any establishment
    if (!isAdmin && requestedEstablishmentId !== auth.establishmentId) {
      throw new ForbiddenError();
    }
    targetEstablishmentId = requestedEstablishmentId;
  } else {
    // Default to current user's establishment (may be undefined for France entière)
    targetEstablishmentId = auth.establishmentId;
  }

  logger.info('Get geo statistics', {
    userId: user.id,
    targetEstablishmentId,
    level,
    code
  });

  // Initialize geo mappings (cached after first call)
  await initializeMappings();

  let statistics: GeoStatisticsDTO[];

  switch (level) {
    case 'region':
      statistics = await getRegionStatistics(targetEstablishmentId);
      break;
    case 'department':
      statistics = await getDepartmentStatistics(targetEstablishmentId, code);
      break;
    case 'epci':
      statistics = await getEPCIStatistics(targetEstablishmentId, code);
      break;
    default:
      throw new Error(`Invalid level: ${level}`);
  }

  const result: GeoStatisticsResponseDTO = {
    level,
    establishmentId: targetEstablishmentId,
    statistics
  };

  response.status(constants.HTTP_STATUS_OK).json(result);
}

/**
 * Get housing counts aggregated by region
 * If establishmentId is undefined, returns statistics for all housings (France entière)
 */
async function getRegionStatistics(
  establishmentId: string | undefined
): Promise<GeoStatisticsDTO[]> {
  // Get counts by department
  const departmentCounts = await geoStatisticsRepository.countByDepartment({
    establishmentId
  });

  // Aggregate by region
  const regionCounts = new Map<string, number>();

  for (const dept of departmentCounts) {
    const regionCode = departmentToRegionMap!.get(dept.code);
    if (regionCode) {
      const current = regionCounts.get(regionCode) || 0;
      regionCounts.set(regionCode, current + dept.housingCount);
    }
  }

  // Convert to DTO array
  const statistics: GeoStatisticsDTO[] = [];
  for (const [code, count] of regionCounts) {
    statistics.push({
      code,
      name: regionNamesMap!.get(code) || code,
      housingCount: count
    });
  }

  // Sort by housing count descending
  return statistics.sort((a, b) => b.housingCount - a.housingCount);
}

/**
 * Get housing counts by department, optionally filtered by region
 * If establishmentId is undefined, returns statistics for all housings (France entière)
 *
 * Security: If regionCode is provided and establishmentId is set, validates that
 * the establishment covers ALL communes of ALL departments in the region.
 */
async function getDepartmentStatistics(
  establishmentId: string | undefined,
  regionCode?: string
): Promise<GeoStatisticsDTO[]> {
  // Security check for region filter (restrictive: must have ALL communes of ALL departments)
  if (regionCode && establishmentId) {
    const establishment = await establishmentRepository.get(establishmentId);
    if (!establishment) {
      logger.warn('Establishment not found for department statistics', { establishmentId });
      return [];
    }

    // Get all departments in the requested region
    const departmentsInRegion = Array.from(departmentToRegionMap!.entries())
      .filter(([, region]) => region === regionCode)
      .map(([dept]) => dept);

    const establishmentGeoCodes = new Set(establishment.geoCodes);

    // For each department in the region, check that ALL communes are in the establishment
    for (const deptCode of departmentsInRegion) {
      const communesInDept = await geoAPI.getCommunesByDepartment(deptCode);
      const hasAllCommunes = communesInDept.every((commune) =>
        establishmentGeoCodes.has(commune.code)
      );

      if (!hasAllCommunes) {
        const missingCommunes = communesInDept
          .filter((commune) => !establishmentGeoCodes.has(commune.code))
          .map((c) => c.code);
        logger.warn('Region access denied - establishment does not cover all communes of department', {
          establishmentId,
          regionCode,
          deptCode,
          totalCommunes: communesInDept.length,
          missingCount: missingCommunes.length
        });
        throw new ForbiddenError();
      }
    }
  }

  const departmentCounts = await geoStatisticsRepository.countByDepartment({
    establishmentId
  });

  let filtered = departmentCounts;

  // Filter by region if specified
  if (regionCode) {
    filtered = departmentCounts.filter((dept) => {
      const deptRegion = departmentToRegionMap!.get(dept.code);
      return deptRegion === regionCode;
    });
  }

  return filtered.map((dept) => ({
    code: dept.code,
    name: departmentNamesMap!.get(dept.code) || dept.code,
    housingCount: dept.housingCount
  }));
}

/**
 * Get housing counts by EPCI for a department
 *
 * Security: If departmentCode is provided and establishmentId is set, validates that
 * the department is within the establishment's geoCodes.
 * If establishmentId is undefined (France entière), no security check is performed.
 */
async function getEPCIStatistics(
  establishmentId: string | undefined,
  departmentCode?: string
): Promise<GeoStatisticsDTO[]> {
  if (!departmentCode) {
    // Return empty array if no department code provided
    return [];
  }

  // Get all communes in the department with their EPCI codes
  const communes = await geoAPI.getCommunesByDepartment(departmentCode);

  // Get EPCIs for this department to get their names
  const epcis = await geoAPI.getEPCIsByDepartment(departmentCode);
  const epciNamesMap = new Map(epcis.map((e) => [e.code, e.nom]));

  // Security check for department filter (restrictive: must have ALL communes of ALL EPCIs)
  if (establishmentId) {
    const establishment = await establishmentRepository.get(establishmentId);
    if (!establishment) {
      logger.warn('Establishment not found for EPCI statistics', { establishmentId });
      return [];
    }

    // Build a map of EPCI code -> communes in that EPCI
    const epciToCommunes = new Map<string, string[]>();
    for (const commune of communes) {
      if (commune.codeEpci) {
        const existing = epciToCommunes.get(commune.codeEpci) || [];
        existing.push(commune.code);
        epciToCommunes.set(commune.codeEpci, existing);
      }
    }

    // Get all EPCIs in this department
    const epcisInDepartment = Array.from(epciToCommunes.keys());

    // Check that establishment has ALL communes of EACH EPCI in the department
    const establishmentGeoCodes = new Set(establishment.geoCodes);
    const hasAllEpcis = epcisInDepartment.every((epciCode) => {
      const communesInEpci = epciToCommunes.get(epciCode) || [];
      // Must have ALL communes of this EPCI, not just some
      return communesInEpci.every((communeCode) =>
        establishmentGeoCodes.has(communeCode)
      );
    });

    if (!hasAllEpcis) {
      const missingEpcis = epcisInDepartment.filter((epciCode) => {
        const communesInEpci = epciToCommunes.get(epciCode) || [];
        return !communesInEpci.every((communeCode) =>
          establishmentGeoCodes.has(communeCode)
        );
      });
      logger.warn('Department access denied - establishment does not cover all communes of all EPCIs', {
        establishmentId,
        departmentCode,
        epcisInDepartment: epcisInDepartment.length,
        missingEpcisCount: missingEpcis.length
      });
      throw new ForbiddenError();
    }
  }

  // Get all commune geo codes
  const communeGeoCodes = communes.map((c) => c.code);

  // Get housing counts for these communes
  const communeCounts = await geoStatisticsRepository.countByCommuneInGeoCodes(
    establishmentId,
    communeGeoCodes
  );

  // Create a map of commune -> housing count
  const communeCountMap = new Map(
    communeCounts.map((c) => [c.code, c.housingCount])
  );

  // Aggregate by EPCI
  const epciCounts = new Map<string, number>();
  for (const commune of communes) {
    if (commune.codeEpci) {
      const housingCount = communeCountMap.get(commune.code) || 0;
      const current = epciCounts.get(commune.codeEpci) || 0;
      epciCounts.set(commune.codeEpci, current + housingCount);
    }
  }

  // Convert to DTO array, filtering out EPCIs with 0 housings
  const statistics: GeoStatisticsDTO[] = [];
  for (const [code, count] of epciCounts) {
    if (count > 0) {
      statistics.push({
        code,
        name: epciNamesMap.get(code) || code,
        housingCount: count
      });
    }
  }

  // Sort by housing count descending
  return statistics.sort((a, b) => b.housingCount - a.housingCount);
}

export default {
  getStatisticsValidators,
  getStatistics
};
