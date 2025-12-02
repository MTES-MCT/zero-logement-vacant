import { identity } from 'effect';
import type { Point } from 'geojson';
import { match, Pattern } from 'ts-pattern';

import { Occupancy, OCCUPANCY_VALUES } from './Occupancy';

/**
 * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/pb0010_local/last/
 */
export interface DatafoncierHousing {
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
  assieft: string | null;
  ccpper: string;
  codique: string | null;
  gpdl: string;
  ctpdl: string | null;
  dnupro: string;
  jdatat: string;
  jdatatv: string;
  jdatatan: string | null;
  dnufnl: string | null;
  ccoeva: string;
  ccoevatxt: string;
  dteloc: string;
  dteloctxt: string;
  typeloc: string | null;
  logh: boolean | null;
  loghmais: boolean | null;
  loghappt: boolean | null;
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
  ccthp: string | null;
  rppo_rs: string;
  typeact: string | null;
  loghvac: string | null;
  loghvac2a: boolean | null;
  loghvac5a: boolean | null;
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
  jannath: string | null;
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
  /**
   * Warning: this point might use various SRID e.g. EPSG:32620, EPSG:2154, etc.
   * One should convert it first to EPSG:4326 before storing it in a production table.
   */
  ban_geom: Point | null;
  ban_type: string;
  ban_score: string;
  ban_cp: string;
  /**
   * Warning: this point might use various SRID e.g. EPSG:32620, EPSG:2154, etc.
   * One should convert it first to EPSG:4326 before storing it in a production table.
   */
  geomloc: Point | null;
  dis_ban_ff: number;
  rnb_id: string | null;
  rnb_id_score: string | null;
  /**
   * Warning: this point might use various SRID e.g. EPSG:32620, EPSG:2154, etc.
   * One should convert it first to EPSG:4326 before storing it in a production table.
   */
  geomrnb: Point | null;
  idpk: number | null;
}

export function toOccupancy(ccthp: DatafoncierHousing['ccthp']): Occupancy {
  const occupancy = OCCUPANCY_VALUES.find((occupancy) => occupancy === ccthp);
  return match(occupancy)
    .with(
      Occupancy.FREE,
      Occupancy.CIVIL_SERVANT,
      Occupancy.ARTISAN,
      Occupancy.COMMON,
      Occupancy.RURAL,
      () => Occupancy.OTHERS
    )
    .with(Pattern.nonNullable, identity)
    .otherwise(() => Occupancy.UNKNOWN);
}

export function toBuildingLocation(
  datafoncierHousing: Pick<
    DatafoncierHousing,
    'dnubat' | 'descc' | 'dniv' | 'dpor'
  >
): string {
  return `${datafoncierHousing.dnubat}${datafoncierHousing.descc}${datafoncierHousing.dniv}${datafoncierHousing.dpor}`;
}
