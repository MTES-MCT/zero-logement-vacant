import {
  getSubStatuses,
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingStatus
} from '@zerologementvacant/models';

/**
 * Legacy status / sub-status mapping, mirroring migration
 * `073-housing-refactor-statuses`. Some rows and events still carry pre-073
 * labels (the migration missed values whose apostrophes did not match). We
 * normalise them to the current vocabulary before deciding.
 */

// Straight (') and typographic (’) apostrophes are used interchangeably in the
// data; canonicalise so lookups and comparisons match either form.
function canon(value: string): string {
  return value.replace(/’/g, "'");
}

export function requiresSubStatus(status: HousingStatus): boolean {
  return (
    status === HousingStatus.FIRST_CONTACT ||
    status === HousingStatus.IN_PROGRESS ||
    status === HousingStatus.COMPLETED ||
    status === HousingStatus.BLOCKED
  );
}

// Every current sub-status, indexed by its canonical (apostrophe-insensitive)
// form so map targets can be written loosely and resolved to the exact string.
const SUB_BY_CANON: ReadonlyMap<string, string> = new Map(
  HOUSING_STATUS_VALUES.flatMap((status) =>
    [...getSubStatuses(status)].map((sub): [string, string] => [
      canon(sub),
      sub
    ])
  )
);

function resolveSub(loose: string): string {
  const exact = SUB_BY_CANON.get(canon(loose));
  if (exact === undefined) {
    throw new Error(`legacy map: no current sub-status matches "${loose}"`);
  }
  return exact;
}

// Status label → HousingStatus (current labels + surviving legacy labels).
const STATUS_LABELS: ReadonlyMap<string, HousingStatus> = new Map(
  [
    ...HOUSING_STATUS_VALUES.map((status): [string, HousingStatus] => [
      HOUSING_STATUS_LABELS[status],
      status
    ]),
    ['Jamais contacté', HousingStatus.NEVER_CONTACTED],
    ['Bloqué', HousingStatus.BLOCKED],
    ['Non-vacant', HousingStatus.COMPLETED],
    ['Sortie de la vacance', HousingStatus.COMPLETED]
  ].map(([label, status]): [string, HousingStatus] => [
    canon(label as string),
    status as HousingStatus
  ])
);

// Legacy status labels whose name also determines the sub-status (the event's
// own sub-status is ignored).
const STATUS_FULL_PAIR: ReadonlyMap<
  string,
  { status: HousingStatus; subStatus: string | null }
> = new Map(
  (
    [
      [
        'Jamais contacté',
        { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      ],
      [
        'Non-vacant',
        { status: HousingStatus.COMPLETED, subStatus: "N'était pas vacant" }
      ],
      [
        'Sortie de la vacance',
        { status: HousingStatus.COMPLETED, subStatus: 'Sortie de la vacance' }
      ]
    ] as ReadonlyArray<
      [string, { status: HousingStatus; subStatus: string | null }]
    >
  ).map(([label, pair]) => [
    canon(label),
    {
      status: pair.status,
      subStatus: pair.subStatus === null ? null : resolveSub(pair.subStatus)
    }
  ])
);

// Legacy sub-status → canonical current sub-status (and, for a few, the status
// it implies). Targets are resolved to the exact current string.
const SUB_RENAMES: ReadonlyMap<
  string,
  { status?: HousingStatus; subStatus: string }
> = new Map(
  (
    [
      [
        'NPAI',
        {
          status: HousingStatus.FIRST_CONTACT,
          subStatus: 'N’habite pas à l’adresse indiquée'
        }
      ],
      [
        'Mutation en cours',
        {
          status: HousingStatus.IN_PROGRESS,
          subStatus: 'Mutation en cours ou effectuée'
        }
      ],
      ['Intérêt potentiel', { subStatus: 'Intérêt potentiel / En réflexion' }],
      ['Via accompagnement', { subStatus: 'Sortie de la vacance' }],
      ['Sans accompagnement', { subStatus: 'Sortie de la vacance' }],
      ['Absent du millésime suivant', { subStatus: 'Sortie de la vacance' }],
      ['Déclaré non-vacant', { subStatus: "N'était pas vacant" }],
      ['Constaté non-vacant', { subStatus: "N'était pas vacant" }],
      [
        'Vacance volontaire',
        { subStatus: 'Blocage volontaire du propriétaire' }
      ],
      ['Mauvais état', { subStatus: 'Immeuble / Environnement' }],
      [
        'Mauvaise expérience locative',
        { subStatus: 'Blocage volontaire du propriétaire' }
      ],
      [
        'Blocage juridique',
        { subStatus: 'Blocage involontaire du propriétaire' }
      ],
      [
        'Liée au propriétaire',
        { subStatus: 'Blocage involontaire du propriétaire' }
      ],
      [
        'Projet qui n’aboutit pas',
        { subStatus: 'Blocage involontaire du propriétaire' }
      ],
      [
        'Rejet formel de l’accompagnement',
        { subStatus: 'Blocage volontaire du propriétaire' }
      ]
    ] as ReadonlyArray<[string, { status?: HousingStatus; subStatus: string }]>
  ).map(([legacy, target]) => [
    canon(legacy),
    { status: target.status, subStatus: resolveSub(target.subStatus) }
  ])
);

export type Normalized =
  | { ok: true; status: HousingStatus; subStatus: string | null }
  | {
      ok: false;
      reason: 'no-status' | 'unknown-status-label' | 'invalid-sub-status';
    };

function validate(status: HousingStatus, subStatus: string | null): Normalized {
  if (!requiresSubStatus(status)) {
    return { ok: true, status, subStatus: null };
  }
  if (subStatus !== null && getSubStatuses(status).has(subStatus)) {
    return { ok: true, status, subStatus };
  }
  return { ok: false, reason: 'invalid-sub-status' };
}

/**
 * Normalise a `(HousingStatus, sub-status)` pair: apply legacy sub-status
 * renames (which may move the housing to the status the sub-status implies),
 * then validate against the current vocabulary.
 */
export function normalizePair(
  status: HousingStatus,
  subStatus: string | null
): Normalized {
  if (subStatus === null) {
    return validate(status, null);
  }
  const rename = SUB_RENAMES.get(canon(subStatus));
  if (rename) {
    return validate(rename.status ?? status, rename.subStatus);
  }
  return validate(status, subStatus);
}

/**
 * Normalise an event's `next_new` pair, where the status is a (possibly legacy
 * or missing) label rather than a number.
 */
export function normalizeEventPair(
  statusLabel: string | undefined,
  subStatus: string | null | undefined
): Normalized {
  if (statusLabel === undefined) {
    return { ok: false, reason: 'no-status' };
  }
  const fullPair = STATUS_FULL_PAIR.get(canon(statusLabel));
  if (fullPair) {
    return { ok: true, status: fullPair.status, subStatus: fullPair.subStatus };
  }
  const status = STATUS_LABELS.get(canon(statusLabel));
  if (status === undefined) {
    return { ok: false, reason: 'unknown-status-label' };
  }
  return normalizePair(status, subStatus ?? null);
}
