export interface AdministrativeDivisionService {
  getCommune(code: string): Promise<Commune | null>;
  getIntercommunality(code: string): Promise<Intercommunality | null>;
  getDepartment(code: string): Promise<Department | null>;
  getRegion(code: string): Promise<Region | null>;
}

export interface Commune {
  /**
   * The INSEE code of the commune (5 characters, e.g. "75056" for Paris)
   */
  code: string;
  name: string;
  /**
   * The code of the department this commune belongs to
   */
  department: string;
  /**
   * The code of the region this commune belongs to
   */
  region: string;
}

export interface Intercommunality {
  /**
   * The SIREN code of the intercommunality (9 characters)
   */
  code: string;
  name: string;
  /**
   * The codes of the departments this intercommunality belongs to
   */
  departments: string[];
  /**
   * The codes of the regions this intercommunality belongs to
   */
  regions: string[];
}

export interface Department {
  /**
   * The INSEE code of the department (2 or 3 characters, e.g. "75" for Paris, "971" for Guadeloupe)
   */
  code: string;
  name: string;
  /**
   * The code of the region this department belongs to
   */
  region: string;
}

export interface Region {
  /**
   * The INSEE code of the region (2 characters, e.g. "11" for Île-de-France)
   */
  code: string;
  name: string;
}