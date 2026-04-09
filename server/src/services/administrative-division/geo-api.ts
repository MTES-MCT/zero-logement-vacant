import axios from 'axios';
import z from 'zod';

import type {
  AdministrativeDivisionService,
  Commune,
  Department,
  Intercommunality,
  Region
} from './administrative-division-service';

class GeoAPI implements AdministrativeDivisionService {
  private readonly http = axios.create({
    baseURL: 'https://geo.api.gouv.fr',
    timeout: 5000
  });

  /**
   *
   * @param code
   * @returns
   * @throws Will throw an error if the API call fails or if the response data is invalid
   */
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
    const { data } = await this.http.get<unknown>(`/departements/${code}`);
    const department = departmentSchema.parse(data);
    return {
      code: department.code,
      name: department.nom,
      region: department.codeRegion
    };
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
  return new GeoAPI();
}
