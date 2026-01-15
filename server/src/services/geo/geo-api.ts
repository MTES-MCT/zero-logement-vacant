import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  GeoDepartment,
  GeoEPCI,
  GeoRegion
} from '@zerologementvacant/models';
import { createLogger } from '~/infra/logger';

const logger = createLogger('geo-api');

/**
 * Commune with EPCI information from geo.api.gouv.fr
 */
export interface GeoCommune {
  code: string;
  nom: string;
  codeDepartement: string;
  codeRegion: string;
  codeEpci?: string;
}

/**
 * EPCI with department codes from geo.api.gouv.fr
 */
export interface GeoEPCIWithDepartments {
  code: string;
  nom: string;
  codesDepartements: string[];
  codesRegions: string[];
  population: number;
}

export interface GeoAPI {
  getRegions(): Promise<GeoRegion[]>;
  getDepartments(): Promise<GeoDepartment[]>;
  getEPCI(siren: string): Promise<GeoEPCI | null>;
  getEPCIsByDepartment(departmentCode: string): Promise<GeoEPCIWithDepartments[]>;
  getCommune(geoCode: string): Promise<GeoCommune | null>;
  getCommunesByDepartment(departmentCode: string): Promise<GeoCommune[]>;
  getCommunesByEPCI(epciSiren: string): Promise<GeoCommune[]>;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for static geo data
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const isRetryable =
        axios.isAxiosError(error) &&
        (error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.response?.status === 429 ||
          error.response?.status === 503 ||
          error.response?.status === 502 ||
          error.response?.status === 504);

      if (!isRetryable || attempt === maxRetries) {
        logger.error(`${context} failed after ${attempt} attempt(s)`, {
          error: axios.isAxiosError(error)
            ? { code: error.code, status: error.response?.status, message: error.message }
            : { message: (error as Error).message }
        });
        throw error;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`${context} failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, {
        error: axios.isAxiosError(error)
          ? { code: error.code, status: error.response?.status }
          : { message: (error as Error).message }
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

class GeoAPIImpl implements GeoAPI {
  private readonly http: AxiosInstance;
  private regionsCache: CacheEntry<GeoRegion[]> | null = null;
  private departmentsCache: CacheEntry<GeoDepartment[]> | null = null;
  private communesByEPCICache: Map<string, CacheEntry<GeoCommune[]>> = new Map();

  constructor() {
    this.http = axios.create({
      baseURL: 'https://geo.api.gouv.fr',
      timeout: 10000
    });

    // Log all requests for debugging
    this.http.interceptors.request.use((config) => {
      logger.debug('geo.api.gouv.fr request', {
        method: config.method?.toUpperCase(),
        url: config.url
      });
      return config;
    });

    // Log response times
    this.http.interceptors.response.use(
      (response) => {
        logger.debug('geo.api.gouv.fr response', {
          url: response.config.url,
          status: response.status,
          duration: response.headers['x-response-time']
        });
        return response;
      },
      (error: AxiosError) => {
        logger.warn('geo.api.gouv.fr error', {
          url: error.config?.url,
          status: error.response?.status,
          code: error.code,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  private isCacheValid<T>(cache: CacheEntry<T> | null | undefined): cache is CacheEntry<T> {
    return cache !== null && cache !== undefined && Date.now() < cache.expiresAt;
  }

  async getRegions(): Promise<GeoRegion[]> {
    if (this.isCacheValid(this.regionsCache)) {
      logger.debug('Using cached regions');
      return this.regionsCache.data;
    }

    const data = await withRetry(
      async () => {
        const response = await this.http.get<GeoRegion[]>('/regions');
        return response.data;
      },
      'Fetching regions'
    );

    this.regionsCache = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    logger.info('Fetched and cached regions', { count: data.length });
    return data;
  }

  async getDepartments(): Promise<GeoDepartment[]> {
    if (this.isCacheValid(this.departmentsCache)) {
      logger.debug('Using cached departments');
      return this.departmentsCache.data;
    }

    const data = await withRetry(
      async () => {
        const response = await this.http.get<GeoDepartment[]>('/departements');
        return response.data;
      },
      'Fetching departments'
    );

    this.departmentsCache = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    logger.info('Fetched and cached departments', { count: data.length });
    return data;
  }

  async getEPCI(siren: string): Promise<GeoEPCI | null> {
    // Validate SIREN format (9 digits)
    if (!/^\d{9}$/.test(siren)) {
      logger.warn('Invalid EPCI SIREN format', { siren });
      return null;
    }

    try {
      const data = await withRetry(
        async () => {
          const response = await this.http.get<GeoEPCI>(`/epcis/${siren}`);
          return response.data;
        },
        `Fetching EPCI ${siren}`
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug('EPCI not found', { siren });
        return null;
      }
      throw error;
    }
  }

  async getEPCIsByDepartment(departmentCode: string): Promise<GeoEPCIWithDepartments[]> {
    // Validate department code format:
    // - Metropolitan: 01-95 (2 digits)
    // - Corsica: 2A, 2B
    // - DOM-TOM: 971-976, 984-989 (3 digits)
    if (!/^([0-9]{2,3}|2[AB])$/.test(departmentCode)) {
      logger.warn('Invalid department code format for EPCI lookup', { departmentCode });
      return [];
    }

    try {
      const data = await withRetry(
        async () => {
          const response = await this.http.get<GeoEPCIWithDepartments[]>(
            '/epcis',
            { params: { codeDepartement: departmentCode } }
          );
          return response.data;
        },
        `Fetching EPCIs for department ${departmentCode}`
      );

      logger.info('Fetched EPCIs for department', {
        departmentCode,
        count: data.length
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug('No EPCIs found for department', { departmentCode });
        return [];
      }
      throw error;
    }
  }

  async getCommunesByDepartment(departmentCode: string): Promise<GeoCommune[]> {
    // Validate department code format:
    // - Metropolitan: 01-95 (2 digits)
    // - Corsica: 2A, 2B
    // - DOM-TOM: 971-976, 984-989 (3 digits)
    if (!/^([0-9]{2,3}|2[AB])$/.test(departmentCode)) {
      logger.warn('Invalid department code format for communes lookup', { departmentCode });
      return [];
    }

    try {
      const data = await withRetry(
        async () => {
          const response = await this.http.get<GeoCommune[]>(
            `/departements/${departmentCode}/communes`,
            { params: { fields: 'code,nom,codeDepartement,codeRegion,codeEpci' } }
          );
          return response.data;
        },
        `Fetching communes for department ${departmentCode}`
      );

      logger.info('Fetched communes for department', {
        departmentCode,
        count: data.length
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug('No communes found for department', { departmentCode });
        return [];
      }
      throw error;
    }
  }

  async getCommune(geoCode: string): Promise<GeoCommune | null> {
    // Validate geo code format (5 characters)
    if (!/^[0-9A-Z]{5}$/.test(geoCode)) {
      logger.warn('Invalid commune geo code format', { geoCode });
      return null;
    }

    try {
      const data = await withRetry(
        async () => {
          const response = await this.http.get<GeoCommune>(`/communes/${geoCode}`);
          return response.data;
        },
        `Fetching commune ${geoCode}`
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.debug('Commune not found', { geoCode });
        return null;
      }
      throw error;
    }
  }

  async getCommunesByEPCI(epciSiren: string): Promise<GeoCommune[]> {
    // Validate SIREN format
    if (!/^\d{9}$/.test(epciSiren)) {
      logger.warn('Invalid EPCI SIREN format for communes lookup', { epciSiren });
      return [];
    }

    // Check cache
    const cached = this.communesByEPCICache.get(epciSiren);
    if (this.isCacheValid(cached)) {
      logger.debug('Using cached communes for EPCI', { epciSiren });
      return cached.data;
    }

    try {
      const data = await withRetry(
        async () => {
          const response = await this.http.get<GeoCommune[]>(
            `/epcis/${epciSiren}/communes`
          );
          return response.data;
        },
        `Fetching communes for EPCI ${epciSiren}`
      );

      // Cache the result
      this.communesByEPCICache.set(epciSiren, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      logger.info('Fetched and cached communes for EPCI', {
        epciSiren,
        count: data.length
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('EPCI not found for communes lookup', { epciSiren });
        return [];
      }
      throw error;
    }
  }
}

export function createGeoAPI(): GeoAPI {
  return new GeoAPIImpl();
}

export default createGeoAPI();
