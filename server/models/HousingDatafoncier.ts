import {
  HousingRecordApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from './HousingApi';
import { v4 as uuidv4 } from 'uuid';
import { ReferenceDataYear } from '../repositories/housingRepository';
import { HousingStatusApi } from './HousingStatusApi';

/**
 * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/pb0010_local/last/
 */
export interface HousingDatafoncier {
  idlocal: string;
  idbat: string;
  idpar: string;
  idtup: string;
  idsec: string;
  idvoie: string;
  idprocpte: string;
  idcom: string;
  idcomtxt: string;
  ccodep: string;
  ccodir: string;
  ccocom: string;
  invar: string;
  ccopre: string | null;
  ccosec: string;
  dnupla: string;
  dnubat: string;
  descc: string;
  dniv: string;
  dpor: string;
  ccoriv: string;
  ccovoi: string;
  dnvoiri: string;
  dindic: string | null;
  ccocif: string;
  dvoilib: string;
  cleinvar: string;
  ccpper: string;
  gpdl: string;
  ctpdl: string | null;
  dnupro: string;
  jdatat: string;
  jdatatv: string;
  jdatatan: number;
  dnufnl: string | null;
  ccoeva: string;
  ccoevatxt: string;
  dteloc: string;
  dteloctxt: string;
  logh: string;
  loghmais: string;
  loghappt: string | null;
  gtauom: string;
  dcomrd: string;
  ccoplc: string | null;
  ccoplctxt: string | null;
  cconlc: string;
  cconlctxt: string;
  dvltrt: number;
  cc48lc: string | null;
  dloy48a: number | null;
  top48a: string;
  dnatlc: string;
  ccthp: string;
  proba_rprs: string;
  typeact: string | null;
  loghvac: string | null;
  loghvac2a: string | null;
  loghvac5a: string | null;
  loghvacdeb: string | null;
  cchpr: string | null;
  jannat: string;
  dnbniv: string;
  nbetagemax: number;
  nbnivssol: number | null;
  hlmsem: string | null;
  loghlls: string;
  postel: string | null;
  dnatcg: string | null;
  jdatcgl: string;
  fburx: number;
  gimtom: string | null;
  cbtabt: string | null;
  jdbabt: string | null;
  jrtabt: string | null;
  cconac: string | null;
  cconactxt: string | null;
  toprev: string;
  ccoifp: number;
  jannath: number;
  janbilmin: number;
  npevph: number;
  stoth: number;
  stotdsueic: number;
  npevd: number;
  stotd: number;
  npevp: number;
  sprincp: number;
  ssecp: number;
  ssecncp: number;
  sparkp: number;
  sparkncp: number;
  npevtot: number;
  slocal: number;
  npiece_soc: number;
  npiece_ff: number;
  npiece_i: number;
  npiece_p2: number;
  nbannexe: number;
  nbgarpark: number;
  nbagrement: number;
  nbterrasse: number;
  nbpiscine: number;
  ndroit: number;
  ndroitindi: number;
  ndroitpro: number;
  ndroitges: number;
  catpro2: string;
  catpro2txt: string;
  catpro3: string;
  catpropro2: string;
  catproges2: string;
  locprop: string;
  locproptxt: string;
  source_geo: string;
  vecteur: string;
  ban_id: string;
  ban_type: string;
  ban_score: any;
  ban_cp: string;
  dis_ban_ff: number;
  idpk: number;
}

export function toHousingRecordApi(
  housing: HousingDatafoncier
): HousingRecordApi {
  // Should be erased later in the chain
  // by the original housing id if it exists
  const housingId = uuidv4();
  return {
    id: housingId,
    invariant: housing.invar,
    localId: housing.idlocal,
    rawAddress: [`${housing.dnvoiri} ${housing.dvoilib}`, housing.idcomtxt],
    geoCode: housing.idcom,
    // TODO: no data
    uncomfortable: false,
    housingKind: housing.dteloctxt === 'MAISON' ? 'MAISON' : 'APPART',
    roomsCount: housing.npiece_p2,
    livingArea: housing.stoth,
    buildingYear: housing.jannath,
    taxed: false,
    dataYears: [ReferenceDataYear + 1],
    buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
    ownershipKind: housing.ctpdl as OwnershipKindsApi,
    status: HousingStatusApi.NeverContacted,
    occupancy: OccupancyKindApi.Rent,
    occupancyRegistered: OccupancyKindApi.Rent,
  };
}
