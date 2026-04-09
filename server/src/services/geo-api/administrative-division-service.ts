export interface AdministrativeDivisionService {
  getCommune(code: string): Promise<Commune | null>;
  getDepartment(code: string): Promise<Department | null>;
}

export interface Commune {
  code: string;
  name: string;
  department: string;
  region: string;
}

export interface Department {
  code: string;
  name: string;
  region: string;
}
