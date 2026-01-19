/**
 * Geographic level for statistics aggregation
 */
export type GeoLevel = 'region' | 'department' | 'epci' | 'commune';

/**
 * Statistics for a geographic area
 */
export interface GeoStatisticsDTO {
  /**
   * Geographic code (region code, department code, or EPCI SIREN)
   */
  code: string;
  /**
   * Name of the geographic area
   */
  name: string;
  /**
   * Number of housings in this area
   */
  housingCount: number;
}

/**
 * Response for geographic statistics endpoint
 */
export interface GeoStatisticsResponseDTO {
  /**
   * Geographic level of aggregation
   */
  level: GeoLevel;
  /**
   * Establishment ID
   */
  establishmentId: string;
  /**
   * Statistics per geographic area
   */
  statistics: GeoStatisticsDTO[];
}

/**
 * Region from geo.api.gouv.fr
 */
export interface GeoRegion {
  code: string;
  nom: string;
}

/**
 * Department from geo.api.gouv.fr
 */
export interface GeoDepartment {
  code: string;
  nom: string;
  codeRegion: string;
}

/**
 * EPCI from geo.api.gouv.fr
 */
export interface GeoEPCI {
  code: string;
  nom: string;
}
