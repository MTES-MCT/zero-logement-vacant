import joi from 'joi';
import date from '@joi/date';

import { OwnerApi } from '../../server/models/OwnerApi';
import {
  getOwnershipKindFromValue,
  HousingApi,
  OccupancyKindApi,
} from '../../server/models/HousingApi';

joi.extend(date);

export type NonVacantHousing = {
  invariant: string;
  ff_idlocal: string;
  ff_idbat: string;
  ff_dnvoiri: string;
  ff_dindic: string;
  ff_dvoilib: string;
  ff_idcom: string;
  ff_x_4326: number;
  ff_y_4326: number;
  ff_dcapec2: number;
  ff_dnbwc: number;
  ff_dnbbai: number;
  ff_dnbdou: number;
  debutvacance: number;
  ff_dteloc: string;
  ff_npiece_p2: number;
  ff_stoth: number;
  refcad: string;
  ff_jannath: number;
  ff_jdatat: number;
  txtlv: string;
  data_year: number;
  ff_ndroit: number;
  batloc: string;
  vlcad: number;
  ff_ctpdl: string;
  ff_ccogrm: string;
  ff_catpro2txt: string;
  ff_ccthp: string;
} & Record<`ff_ddenom_${OwnerIndex}`, string> &
  Record<`ff_dlign_3_${OwnerIndex}`, string> &
  Record<`ff_dlign_4_${OwnerIndex}`, string> &
  Record<`ff_dlign_5_${OwnerIndex}`, string> &
  Record<`ff_dlign_6_${OwnerIndex}`, string> &
  Record<`ff_jdatnss_${OwnerIndex}`, string>;

type OwnerIndex = 1 | 2 | 3 | 4 | 5 | 6;

const createOwnerSchema = (i: OwnerIndex) =>
  joi.object({
    [`ff_ddenom_${i}`]: joi.string().trim().uppercase(),
    [`ff_dlign_3_${i}`]: joi.string().trim(),
    [`ff_dlign_4_${i}`]: joi.string().trim(),
    [`ff_dlign_5_${i}`]: joi.string().trim(),
    [`ff_dlign_6_${i}`]: joi.string().trim(),
    [`ff_jdatnss_${i}`]: joi.date(),
  });

export const nonVacantHousingSchema = joi
  .object<NonVacantHousing>({
    invariant: joi.string(),
    ff_idlocal: joi.string(),
    ff_idbat: joi.string(),
    ff_dnvoiri: joi.string(),
    ff_dindic: joi.string(),
    ff_dvoilib: joi.string(),
    ff_idcom: joi.string().length(5),
    // TODO: check these limits
    ff_x_4326: joi.number().min(-180).max(180),
    ff_y_4326: joi.number().min(-90).max(90),
    ff_dcapec2: joi.number().integer().default(0),
    ff_dnbwc: joi.number().integer(),
    ff_dnbbai: joi.number().integer(),
    ff_dnbdou: joi.number().integer(),
    debutvacance: joi.number().integer(),
    ff_dteloc: joi.string(),
    ff_npiece_p2: joi.number().integer().positive(),
    ff_stoth: joi.number().positive(),
    ff_jannath: joi.number(),
    // TODO: verify CSV values
    ff_jdatat: joi.date().utc().format('DDMMYYYY'),
    txtlv: joi.string().trim(),
    ff_ndroit: joi.number().integer().min(1).max(6),
    batloc: joi.string().trim(),
    vlcad: joi.string().trim(),
    ff_ctpdl: joi.string().trim(),
    ff_ccogrm: joi.string().trim(),
    ff_catpro2txt: joi.string().trim(),
    ff_ccthp: joi.string().length(1),
  })
  .concat(createOwnerSchema(1))
  .concat(createOwnerSchema(2))
  .concat(createOwnerSchema(3))
  .concat(createOwnerSchema(4))
  .concat(createOwnerSchema(5))
  .concat(createOwnerSchema(6));

function filterHousing<T extends NonVacantHousing, K extends keyof T>(key: K) {
  return (...values: T[K][]) => {
    const set = new Set(values);

    return (housing: T): boolean => set.has(housing[key]);
  };
}

export const occupancy = filterHousing('ff_ccthp');
export const nature = filterHousing('ff_dteloc');
export const geoCode = filterHousing('ff_idcom');

export function toHousingApi(housing: NonVacantHousing): HousingApi {
  return {
    invariant: housing.invariant,
    localId: housing.ff_idlocal,
    // TODO: add locality from ff_idcom
    rawAddress: [housing.ff_dnvoiri, housing.ff_dindic, housing.ff_dvoilib],
    latitude: housing.ff_y_4326,
    longitude: housing.ff_x_4326,
    cadastralClassification: housing.ff_dcapec2,
    uncomfortable:
      housing.ff_dcapec2 > 6 ||
      housing.ff_dnbwc === 0 ||
      housing.ff_dnbbai + housing.ff_dnbdou === 0,
    vacancyStartYear: housing.debutvacance,
    housingKind:
      housing.ff_dteloc === '1'
        ? 'MAISON'
        : housing.ff_dteloc === '2'
        ? 'APPART'
        : '',
    roomsCount: housing.ff_npiece_p2,
    livingArea: Math.floor(housing.ff_stoth),
    cadastralReference: housing.refcad,
    buildingYear: housing.ff_jannath > 100 ? housing.ff_jdatat : undefined,
    // TODO: Mutation date missing ?
    taxed: housing.txtlv !== '',
    // TODO: Beneficiary count missing ?
    buildingLocation: housing.batloc,
    // TODO: Missing rental value
    ownershipKind: getOwnershipKindFromValue(housing.ff_ctpdl),
    // TODO: owner
    // TODO: coowners
    occupancy:
      housing.ff_ccthp === 'L'
        ? OccupancyKindApi.Rent
        : OccupancyKindApi.Others,
  } as HousingApi;
}

export function toOwnerApi(): OwnerApi {
  // TODO
  throw new Error('Not implemented.');
}
