import fetch from '@adobe/node-fetch-retry';
import async from 'async';
import highland from 'highland';
import fp from 'lodash/fp';
import { URLSearchParams } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import {
  HousingApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from '../models/HousingApi';
import { logger } from '../utils/logger';
import { ReferenceDataYear } from '../repositories/housingRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { isNotNull } from '../../shared/utils/compare';
import { appendAll } from '../utils/stream';
import { PaginationApi } from '../models/PaginationApi';
import config from '../utils/config';
import Stream = Highland.Stream;

const API = `https://apidf-preprod.cerema.fr`;

type FindHousingListOptions = Partial<PaginationApi> & {
  geoCode: string;
};

async function findHousingList(
  opts: FindHousingListOptions
): Promise<HousingApi[]> {
  const housingList = await findRawHousingList(opts);
  return housingList.map((housing) => toHousingApi(housing, []));
}

async function findRawHousingList(
  opts: FindHousingListOptions
): Promise<HousingDTO[]> {
  const query = createQuery({
    fields: 'all',
    dteloc: '1,2',
    code_insee: opts.geoCode,
  });
  const response = await fetch(`${API}/ff/locaux?${query}`, {
    headers: {
      Authorization: `Bearer ${config.datafoncier.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data: ResultDTO<HousingDTO> = await response.json();
  return data.results;
}

interface StreamOptions {
  geoCodes: string[];
}

function untilEmpty<T>(
  fn: (pagination: PaginationApi) => Promise<T[]>,
  onProgress: (items: T[]) => void
): Promise<void> {
  const perPage = 100;
  let page = 1;
  let length = 0;

  return async.doUntil(
    async () => {
      const data = await fn({
        paginate: true,
        page,
        perPage,
      });
      onProgress(data);
      page++;
      length = data.length;
    },
    async () => length < perPage
  );
}

function streamHousingList(opts: StreamOptions): Stream<HousingApi> {
  logger.debug('Stream housing list', {
    options: opts,
  });

  return highland<HousingDTO[]>((push, next) => {
    async
      .forEachSeries(opts.geoCodes, async (geoCode) => {
        await untilEmpty(
          () => findRawHousingList({ geoCode }),
          (housingList) => {
            push(null, housingList);
            next();
          }
        );
      })
      .catch((error) => {
        push(error);
        next();
      });
  })
    .flatten()
    .filter(occupancy('L'))
    .map((housing) => ({ housing }))
    .through(
      appendAll({
        owners: ({ housing }) =>
          findOwners({
            geoCode: housing.idcom,
            forHousing: housing.idprocpte,
          }),
      })
    )
    .map(({ housing, owners }) => toHousingApi(housing, owners));
}

interface FindOwnersOptions {
  geoCode: string;
  /**
   * Pass the communal account id to list house's owners.
   * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/pb0010_local/last/idprocpte
   */
  forHousing?: string;
}

async function findOwners(opts: FindOwnersOptions): Promise<OwnerApi[]> {
  const query = createQuery({
    fields: 'all',
    code_insee: opts.geoCode,
    idprocpte: opts.forHousing,
    // Order by owner rank
    ordering: opts.forHousing ? 'dnulp' : undefined,
  });
  const response = await fetch(`${API}/ff/proprios?${query}`, {
    headers: {
      Authorization: `Bearer ${config.datafoncier.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data: ResultDTO<OwnerDTO> = await response.json();
  return data.results.map(toOwnerApi);
}

function streamOwners(opts: StreamOptions): Stream<OwnerApi> {
  logger.debug('Stream owners', {
    options: opts,
  });

  return highland<OwnerApi[]>((push, next) => {
    async
      .forEachSeries(opts.geoCodes, async (geoCode) => {
        await untilEmpty(
          () => findOwners({ geoCode }),
          (owners) => {
            push(null, owners);
            next();
          }
        );
      })
      .catch((error) => {
        push(error);
        next();
      });
  }).flatten();
}

function createQuery(
  params: Record<string, string | null | undefined>
): URLSearchParams {
  return fp.pipe(
    // Faster than fp.omitBy
    fp.pickBy((value) => !fp.isNil(value)),
    (params: Record<string, string>) => new URLSearchParams(params)
  )(params);
}

function filterHousing<T extends HousingDTO, K extends keyof T>(key: K) {
  return (...values: T[K][]) => {
    const set = new Set(values);

    return (housing: T): boolean => set.has(housing[key]);
  };
}

const occupancy = filterHousing('ccthp');

interface ResultDTO<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/pb0010_local/last/
 */
interface HousingDTO {
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

function toHousingApi(housing: HousingDTO, owners: OwnerApi[]): HousingApi {
  const [owner, ...coowners] = owners;
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
    housingKind: housing.dteloc === '1' ? 'MAISON' : 'APPART',
    roomsCount: housing.npiece_p2,
    livingArea: housing.stoth,
    cadastralReference: 'Nope',
    buildingYear: housing.jannath,
    taxed: false,
    vacancyReasons: [],
    dataYears: [ReferenceDataYear + 1],
    buildingLocation: `${housing.dnubat}${housing.descc}${housing.dniv}${housing.dpor}`,
    ownershipKind: housing.ctpdl as OwnershipKindsApi,
    status: HousingStatusApi.NeverContacted,
    occupancy: OccupancyKindApi.Rent,
    // TODO: verify
    contactCount: 0,
    owner,
    coowners: coowners.map<HousingOwnerApi>((coowner, i) => ({
      ...coowner,
      housingId,
      rank: 2 + i,
    })),
    campaignIds: [],
  };
}

/**
 * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/proprietaire_droit/last/
 */
interface OwnerDTO {
  idprodroit: string;
  idprocpte: string;
  idpersonne: string;
  idvoie: string;
  idcom: string;
  idcomtxt: string;
  ccodep: string;
  ccodir: string;
  ccocom: string;
  dnupro: string;
  dnulp: string;
  ccocif: string;
  dnuper: string;
  ccodro: string;
  ccodrotxt: string;
  typedroit: string;
  ccodem: string;
  ccodemtxt: string;
  gdesip: string;
  gtoper: string;
  ccoqua: string;
  dnatpr: string | null;
  dnatprtxt: string | null;
  ccogrm: string | null;
  ccogrmtxt: string | null;
  dsglpm: string | null;
  dforme: string | null;
  ddenom: string;
  gtyp3: string;
  gtyp4: string;
  gtyp5: string;
  gtyp6: string;
  dlign3: string | null;
  dlign4: string | null;
  dlign5: string | null;
  dlign6: string | null;
  ccopay: string | null;
  ccodep1a2: string;
  ccodira: string;
  ccocomadr: string;
  ccovoi: string;
  ccoriv: string;
  dnvoiri: string;
  dindic: string | null;
  ccopos: string;
  dqualp: string;
  dnomlp: string;
  dprnlp: string;
  jdatnss: string | null;
  dldnss: string;
  dsiren: string | null;
  topja: string | null;
  datja: string | null;
  dformjur: string | null;
  dnomus: string;
  dprnus: string;
  locprop: string;
  locproptxt: string;
  catpro2: string;
  catpro2txt: string;
  catpro3: string;
  catpro3txt: string;
}

function toOwnerApi(owner: OwnerDTO): OwnerApi {
  const kinds: Record<string, string> = {
    'PERSONNE PHYSIQUE': 'Particulier',
    'INVESTISSEUR PROFESSIONNEL': 'Investisseur',
    'SOCIETE CIVILE A VOCATION IMMOBILIERE': 'SCI',
  };

  return {
    id: uuidv4(),
    rawAddress: [owner.dlign3, owner.dlign4, owner.dlign5, owner.dlign6].filter(
      isNotNull
    ),
    fullName: owner.ddenom,
    birthDate: owner.jdatnss ?? undefined,
    kind: kinds[owner.catpro2txt] ?? 'Autre',
    kindDetail: kinds[owner.catpro2txt] ?? 'Autre',
  };
}

export default {
  housing: {
    find: findHousingList,
    stream: streamHousingList,
  },
  owners: {
    find: findOwners,
    stream: streamOwners,
  },
};
