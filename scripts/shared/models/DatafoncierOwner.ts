import { isValid } from 'date-fns';
import joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { OwnerApi } from '../../../server/models/OwnerApi';
import { isNotNull } from '../../../shared/utils/compare';
import { Sort } from '../../../server/models/SortApi';

/**
 * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/proprietaire_droit/last/
 */
export interface DatafoncierOwner {
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
  idpk: number;
}

type DatafoncierOwnerSortable = Pick<DatafoncierOwner, 'idprocpte'>;
export type DatafoncierOwnerSortApi = Sort<DatafoncierOwnerSortable>;

export function toOwnerApi(owner: DatafoncierOwner): OwnerApi {
  const kinds: Record<string, string> = {
    'PERSONNE PHYSIQUE': 'Particulier',
    'INVESTISSEUR PROFESSIONNEL': 'Investisseur',
    'SOCIETE CIVILE A VOCATION IMMOBILIERE': 'SCI',
  };

  const birthdate = owner.jdatnss
    ? new Date(owner.jdatnss.split('/').reverse().join('-'))
    : undefined;

  return {
    id: uuidv4(),
    rawAddress: [owner.dlign3, owner.dlign4, owner.dlign5, owner.dlign6].filter(
      isNotNull
    ),
    fullName:
      owner.catpro2txt === 'PERSONNE PHYSIQUE'
        ? owner.ddenom.replace('/', ' ')
        : owner.ddenom,
    birthDate: isValid(birthdate) ? birthdate : undefined,
    kind: kinds[owner.catpro2txt] ?? 'Autre',
    kindDetail: owner.catpro3txt,
  };
}

const addressSchema = joi.string().uppercase().trim().allow(null);

export const ownerDatafoncierSchema = joi
  .object<DatafoncierOwner>({
    idprodroit: joi.string().length(13),
    idpersonne: joi.string(),
    dlign3: addressSchema,
    dlign4: addressSchema,
    dlign5: addressSchema,
    dlign6: addressSchema,
    catpro2txt: joi.string().trim(),
    catpro3txt: joi.string().trim(),
    jdatnss: joi
      .string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/)
      .when('catpro2txt', {
        not: 'PERSONNE PHYSIQUE',
        then: joi.allow(null),
      }),
    ddenom: joi
      .string()
      .uppercase()
      .trim()
      .replace(/\s+/g, ' '),
      // Pose problème sur les noms composés et provoque l'arrêt du script
      // .when('catpro2txt', {
      //   is: 'PERSONNE PHYSIQUE',
      //   then: joi.string().regex(/^[\w-'\s]+\/[\w-'\s]*$/),
      // }),
  })
  // Require one of the address fields to be filled
  .or('dlign3', 'dlign4', 'dlign5', 'dlign6');
