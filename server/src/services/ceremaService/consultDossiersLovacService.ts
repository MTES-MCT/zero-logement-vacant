export interface CeremaDossier {
  email: string;
  establishmentId: number;
}

export interface ConsultDossiersLovacService {
  consultDossiersLovac(date: Date): Promise<CeremaDossier[]>;
}

export const TEST_DOSSIERS: ReadonlyArray<CeremaDossier> = [
  {
    email: 'test0@structure.fr',
    establishmentId: 0
  },
  {
    email: 'test1@structure.fr',
    establishmentId: 1
  }
];

export const getTestDossiers = (): CeremaDossier[] => {
  return TEST_DOSSIERS.map(dossier => dossier);
}
