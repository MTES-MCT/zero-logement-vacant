import axios from 'axios';
import pMemoize from 'p-memoize';
import z from 'zod';

import type {
  AdministrativeDivisionService,
  Commune,
  Department,
  Intercommunality,
  Region
} from './administrative-division-service';

/**
 * Extract department code from a commune INSEE code.
 * Pure string manipulation — no API call needed.
 *
 * INSEE codes are 5 chars:
 *  - DOM-TOM (starts with 97): first 3 chars are the department code
 *  - Corsica (starts with 2A or 2B): first 2 chars
 *  - Metropolitan France: first 2 digits
 */
export function getDepartmentFromCommune(communeCode: string): string {
  if (!communeCode || communeCode.length < 2) return '';
  if (communeCode.startsWith('97')) return communeCode.substring(0, 3);
  if (communeCode.startsWith('2A') || communeCode.startsWith('2B')) {
    return communeCode.substring(0, 2);
  }
  return communeCode.substring(0, 2);
}

class GeoAPI implements AdministrativeDivisionService {
  private readonly http = axios.create({
    baseURL: 'https://geo.api.gouv.fr',
    timeout: 5000
  });

  async getCommune(code: string): Promise<Commune | null> {
    const { data } = await this.http.get<unknown>(`/communes/${code}`);
    const commune = communeSchema.parse(data);
    return {
      code: commune.code,
      name: commune.nom,
      department: commune.codeDepartement,
      region: commune.codeRegion
    };
  }

  async getIntercommunality(code: string): Promise<Intercommunality | null> {
    const { data } = await this.http.get<unknown>(`/intercommunalites/${code}`);
    const intercommunality = intercommunalitySchema.parse(data);
    return {
      code: intercommunality.code,
      name: intercommunality.nom,
      departments: intercommunality.codeDepartement,
      regions: intercommunality.codeRegion
    };
  }

  async getDepartment(code: string): Promise<Department | null> {
    try {
      const { data } = await this.http.get<unknown>(`/departements/${code}`, {
        params: { fields: 'codeRegion' }
      });
      const department = departmentSchema.parse(data);
      return {
        code: department.code,
        name: department.nom,
        region: department.codeRegion
      };
    } catch {
      return null;
    }
  }

  async getRegion(code: string): Promise<Region | null> {
    const { data } = await this.http.get(`/regions/${code}`);
    const region = regionSchema.parse(data);
    return {
      code: region.code,
      name: region.nom
    };
  }
}

const communeSchema = z.object({
  code: z.string(),
  nom: z.string(),
  codeDepartement: z.string(),
  codeRegion: z.string()
});

const intercommunalitySchema = z.object({
  code: z.string(),
  nom: z.string(),
  codeDepartement: z.array(z.string()),
  codeRegion: z.array(z.string())
});

const departmentSchema = z.object({
  code: z.string(),
  nom: z.string(),
  codeRegion: z.string()
});

const regionSchema = z.object({
  code: z.string(),
  nom: z.string()
});

export function createGeoAPI(): AdministrativeDivisionService {
  const api = new GeoAPI();
  return {
    getCommune: pMemoize(api.getCommune.bind(api)),
    getIntercommunality: pMemoize(api.getIntercommunality.bind(api)),
    getDepartment: pMemoize(api.getDepartment.bind(api)),
    getRegion: pMemoize(api.getRegion.bind(api))
  };
}

/**
 * Singleton GeoAPI instance with per-argument memoization.
 * Use this throughout the server — do not call createGeoAPI() directly.
 */
export const geoAPI = createGeoAPI();
