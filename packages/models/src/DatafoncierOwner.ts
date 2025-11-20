import { Equivalence, Option, pipe } from 'effect';
import { parse } from 'effect/Number';
import { match } from 'ts-pattern';
import { isActiveOwnerRank, type ActiveOwnerRank } from './HousingOwnerDTO';
import type { PropertyRight } from './PropertyRight';

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
  ccodem: string | null;
  ccodemtxt: string | null;
  gdesip: string | null;
  gtoper: string | null;
  ccoqua: string | null;
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
  locprop: string | null;
  locproptxt: string | null;
  catpro2: string;
  catpro2txt: string;
  catpro3: string;
  catpro3txt: string;
  idpk: number;
}

export const IDPERSONNE_EQUIVALENCE = Equivalence.string;

interface Identifiable {
  idpersonne: string;
}

export function DATAFONCIER_OWNER_EQUIVALENCE<T extends Identifiable>(
  a: T,
  b: T
): boolean {
  return Equivalence.mapInput(
    IDPERSONNE_EQUIVALENCE,
    (owner: T) => owner.idpersonne
  )(a, b);
}
export function DATAFONCIER_OWNER_DIFFERENCE<T extends Identifiable>(
  a: T,
  b: T
): boolean {
  return !DATAFONCIER_OWNER_EQUIVALENCE(a, b);
}

/**
 * Convert Datafoncier ccodro to PropertyRight
 * See {@link https://doc-datafoncier.cerema.fr/doc/ff/proprietaire_droit/ccodro}
 * @param ccodro
 * @returns
 */
export function toPropertyRight(
  ccodro: DatafoncierOwner['ccodro']
): PropertyRight | null {
  return (
    match(ccodro)
      .returnType<PropertyRight | null>()
      .with('P', () => 'proprietaire-entier' as const)
      .with('U', () => 'usufruitier' as const)
      .with('N', () => 'nu-proprietaire' as const)
      .with('G', () => 'administrateur' as const)
      .with('S', () => 'syndic' as const)
      .with('H', () => 'associe-sci-ir' as const)
      // In the same order as the documentation
      .with(
        'R',
        'F',
        'T',
        'D',
        'V',
        'W',
        'A',
        'E',
        'K',
        'L',
        'O',
        'J',
        'Q',
        'X',
        'Y',
        'C',
        'M',
        'Z',
        'B',
        () => 'autre' as const
      )
      .otherwise(() => null)
  );
}

export function toSourceRelativeLocation(
  locprop: DatafoncierOwner['locprop']
): number | null {
  return match(Number(locprop))
    .with(1, 2, 3, 4, 5, 6, 9, (value) => value)
    .otherwise(() => null);
}

export function toActiveRank(dnulp: DatafoncierOwner['dnulp']): ActiveOwnerRank {
  return pipe(
    dnulp,
    parse,
    Option.getOrThrowWith(() => new Error(`Invalid dnulp format: ${dnulp}`)),
    (rank) => {
      if (isActiveOwnerRank(rank)) {
        return rank;
      }
      throw new Error(`Invalid owner rank: ${rank}`);
    }
  );
}
