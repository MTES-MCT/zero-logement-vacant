import { SUSPENDED_CAUSE_VALUES } from '@zerologementvacant/models';

import type { EstablishmentApi } from '~/models/EstablishmentApi';
import type { UserApi } from '~/models/UserApi';

import type { CeremaUser } from './consultUserService';
import {
  ACCESS_RIGHTS_ERROR_VALUES,
  type AccessRightsError
} from './perimeterService';

const CEREMA_SUSPENSION_CAUSES = [
  ...SUSPENDED_CAUSE_VALUES,
  ...ACCESS_RIGHTS_ERROR_VALUES
] as const;

type SuspensionState = Pick<UserApi, 'suspendedAt' | 'suspendedCause'>;

function unique(causes: string[]): string[] {
  return [...new Set(causes)];
}

function splitSuspensionCauses(cause: string | null): string[] {
  return (
    cause
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function isCeremaSuspensionCause(cause: string): boolean {
  return CEREMA_SUSPENSION_CAUSES.includes(
    cause as (typeof CEREMA_SUSPENSION_CAUSES)[number]
  );
}

function isPastDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
}

function isLovacAccessExpired(value: string | null | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  if (value === null || value === '') {
    return true;
  }

  return isPastDate(value);
}

function computeCeremaSuspensionCauses(ceremaUser: CeremaUser): string[] {
  const causes: string[] = [];

  if (ceremaUser.cguValide === null || ceremaUser.cguValide === '') {
    causes.push('cgu vides');
  }

  if (isPastDate(ceremaUser.userExpiresAt)) {
    causes.push('droits utilisateur expires');
  }

  if (
    ceremaUser.structureHasLovac === false ||
    isLovacAccessExpired(ceremaUser.structureAccessExpiresAt)
  ) {
    causes.push('droits structure expires');
  }

  if (ceremaUser.groupHasLovac === false) {
    causes.push('niveau_acces_invalide');
  }

  return causes;
}

function getSuspendedAt(
  user: UserApi,
  suspendedCause: string | null
): string | null {
  if (suspendedCause === null) {
    return null;
  }

  if (user.suspendedCause === suspendedCause && user.suspendedAt) {
    return user.suspendedAt;
  }

  return new Date().toJSON();
}

export function getCeremaSuspensionState(
  user: UserApi,
  currentEstablishment: EstablishmentApi | null,
  ceremaUsers: CeremaUser[],
  accessErrors: AccessRightsError[]
): SuspensionState | null {
  const usersForCurrentEstablishment = currentEstablishment
    ? ceremaUsers.filter(
        (cu) =>
          cu.establishmentSiren === currentEstablishment.siren ||
          cu.establishmentSiren === '*'
      )
    : ceremaUsers;

  if (currentEstablishment && usersForCurrentEstablishment.length === 0) {
    return null;
  }

  const previousCauses = splitSuspensionCauses(user.suspendedCause);
  const manualCauses = previousCauses.filter(
    (cause) => !isCeremaSuspensionCause(cause)
  );
  const ceremaCauses = unique([
    ...usersForCurrentEstablishment.flatMap(computeCeremaSuspensionCauses),
    ...accessErrors
  ]);
  const nextCauses = unique([...manualCauses, ...ceremaCauses]);
  const suspendedCause = nextCauses.length > 0 ? nextCauses.join(', ') : null;
  const suspendedAt = getSuspendedAt(user, suspendedCause);

  return {
    suspendedAt,
    suspendedCause
  };
}
