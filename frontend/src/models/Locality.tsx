import type {
  LocalityDTO,
  LocalityKind,
  TaxKind
} from '@zerologementvacant/models';

export type Locality = LocalityDTO;

export const LocalityKinds = {
  ACV: 'ACV',
  PVD: 'PVD'
} as const;

export type LocalityKinds = (typeof LocalityKinds)[keyof typeof LocalityKinds];

export const LocalityKindLabels: Record<LocalityKind, string> = {
  [LocalityKinds.ACV]: 'Action Cœur de Ville',
  [LocalityKinds.PVD]: 'Petites Villes de Demain'
};

export const TaxKindLabels: Record<TaxKind, string> = {
  TLV: 'TLV appliquée',
  THLV: 'THLV appliquée',
  None: 'THLV non appliquée'
};

export const CITIES_WITH_DISTRICTS: Record<string, ReadonlyArray<string>> = {
  '75056': [
    '75101',
    '75102',
    '75103',
    '75104',
    '75105',
    '75106',
    '75107',
    '75108',
    '75109',
    '75110',
    '75111',
    '75112',
    '75113',
    '75114',
    '75115',
    '75116',
    '75117',
    '75118',
    '75119',
    '75120'
  ], // Paris
  '13055': [
    '13201',
    '13202',
    '13203',
    '13204',
    '13205',
    '13206',
    '13207',
    '13208',
    '13209',
    '13210',
    '13211',
    '13212',
    '13213',
    '13214',
    '13215',
    '13216'
  ], // Marseille
  '69123': [
    '69381',
    '69382',
    '69383',
    '69384',
    '69385',
    '69386',
    '69387',
    '69388',
    '69389'
  ] // Lyon
};
export const DISTRICTS: ReadonlyArray<string> = Object.values(
  CITIES_WITH_DISTRICTS
).flat();

export function getDistricts(city: string): ReadonlyArray<string> | null {
  return CITIES_WITH_DISTRICTS[city] ?? null;
}

export function getCity(district: string): string | null {
  return (
    Object.keys(CITIES_WITH_DISTRICTS).find((city) => {
      const districts = CITIES_WITH_DISTRICTS[city];
      return districts.includes(district);
    }) ?? null
  );
}
