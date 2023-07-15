import fetch from '@adobe/node-fetch-retry';
import async from 'async';
import highland from 'highland';
import fp from 'lodash/fp';
import { URLSearchParams } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { OwnerApi } from '../models/OwnerApi';
import { logger } from '../utils/logger';
import { isNotNull } from '../../shared/utils/compare';
import { isPaginationEnabled, PaginationApi } from '../models/PaginationApi';
import config from '../utils/config';
import { untilEmpty } from '../utils/async';
import Stream = Highland.Stream;

const API = `https://apidf-preprod.cerema.fr`;

type FindHousingListOptions = PaginationApi & {
  geoCode: string;
};

async function findHousingList(
  opts: FindHousingListOptions
): Promise<HousingDTO[]> {
  logger.debug('Finding housing list', opts);

  const query = createQuery({
    fields: 'all',
    dteloc: '1,2',
    code_insee: opts.geoCode,
    page: isPaginationEnabled(opts) ? opts.page.toString() : null,
    page_size: isPaginationEnabled(opts) ? opts.perPage.toString() : null,
  });
  const response = await fetch(`${API}/ff/locaux?${query}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
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

function streamHousingList(opts: StreamOptions): Stream<HousingDTO> {
  logger.debug('Stream housing list', opts);

  return highland<string>(opts.geoCodes)
    .flatMap((geoCode) =>
      highland<HousingDTO[]>((push, next) => {
        untilEmpty(
          (pagination) => findHousingList({ geoCode, ...pagination }),
          (housingList) => push(null, housingList)
        )
          .then(() => {
            push(null, highland.nil);
          })
          .catch(push);
      })
    )
    .flatten()
    .filter(occupancy('L'));
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
      Authorization: `Token ${config.datafoncier.token}`,
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
export interface HousingDTO {
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
