import ExternalServiceUnavailableError from '~/errors/externalServiceUnavailableError';
import { logger } from '~/infra/logger';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import userRepository from '~/repositories/userRepository';
import ceremaService from '~/services/ceremaService';
import type { CeremaUser } from '~/services/ceremaService/consultUserService';
import {
  verifyAccessRights,
  type AccessRightsError
} from '~/services/ceremaService/perimeterService';
import { getCeremaSuspensionState } from '~/services/ceremaService/suspensionService';

interface RefreshOptions {
  authoritative?: boolean;
  establishmentId?: string | null;
}

interface AuthorizedEstablishment {
  establishmentId: string;
  establishmentSiren: string;
  hasCommitment: boolean;
}

interface AuthorizationResult {
  authorizedEstablishments: AuthorizedEstablishment[];
  accessErrors: AccessRightsError[];
}

function isIncompleteCeremaUser(ceremaUser: CeremaUser): boolean {
  return !!(ceremaUser.groupFetchFailed || ceremaUser.perimeterFetchFailed);
}

function splitCeremaUsers(ceremaUsers: ReadonlyArray<CeremaUser>) {
  const incompleteCeremaUsers = ceremaUsers.filter(isIncompleteCeremaUser);
  return {
    incompleteCeremaUsers,
    syncableCeremaUsers: ceremaUsers.filter(
      (ceremaUser) => !isIncompleteCeremaUser(ceremaUser)
    )
  };
}

function findCeremaUser(
  ceremaUsers: ReadonlyArray<CeremaUser>,
  establishmentSiren: string
): CeremaUser | undefined {
  return ceremaUsers.find((ceremaUser) =>
    matchesCeremaSiren(ceremaUser, establishmentSiren)
  );
}

function matchesCeremaSiren(
  ceremaUser: CeremaUser,
  establishmentSiren: string
): boolean {
  return (
    ceremaUser.establishmentSiren === establishmentSiren ||
    ceremaUser.establishmentSiren === '*'
  );
}

function getFailedCeremaEntries(ceremaUsers: ReadonlyArray<CeremaUser>) {
  return ceremaUsers.map((ceremaUser) => ({
    establishmentSiren: ceremaUser.establishmentSiren,
    groupFetchFailed: ceremaUser.groupFetchFailed,
    perimeterFetchFailed: ceremaUser.perimeterFetchFailed
  }));
}

async function authorizeEstablishments(
  user: UserApi,
  knownEstablishments: ReadonlyArray<EstablishmentApi>,
  ceremaUsers: ReadonlyArray<CeremaUser>,
  selectedEstablishment: EstablishmentApi | null
): Promise<AuthorizationResult> {
  const authorizedEstablishments: AuthorizedEstablishment[] = [];
  const accessErrors: AccessRightsError[] = [];

  for (const establishment of knownEstablishments) {
    const ceremaUser = findCeremaUser(ceremaUsers, establishment.siren);
    if (!ceremaUser) {
      continue;
    }

    const accessRights = await verifyAccessRights(
      ceremaUser,
      establishment.geoCodes,
      establishment.siren
    );
    if (accessRights.isValid) {
      authorizedEstablishments.push({
        establishmentId: establishment.id,
        establishmentSiren: establishment.siren,
        hasCommitment: ceremaUser.hasCommitment
      });
      continue;
    }

    logger.warn(
      'Access rights verification failed for establishment at login',
      {
        userId: user.id,
        email: user.email,
        establishmentId: establishment.id,
        establishmentSiren: establishment.siren,
        errors: accessRights.errors
      }
    );
    if (establishment.id === selectedEstablishment?.id) {
      accessErrors.push(...accessRights.errors);
    }
  }

  return { authorizedEstablishments, accessErrors };
}

async function syncCeremaSuspension(
  user: UserApi,
  selectedEstablishment: EstablishmentApi | null,
  ceremaUsers: CeremaUser[],
  accessErrors: AccessRightsError[]
): Promise<void> {
  // Re-fetch the user so we preserve fields updated by the sign-in flow and
  // any manual suspension cause written concurrently.
  const currentUser = await userRepository.get(user.id);
  if (!currentUser) {
    return;
  }

  const suspensionState = getCeremaSuspensionState(
    currentUser,
    selectedEstablishment,
    ceremaUsers,
    accessErrors
  );
  if (!suspensionState) {
    logger.info('No Portail DF entry found for selected establishment', {
      userId: user.id,
      email: user.email,
      establishmentId: selectedEstablishment?.id,
      establishmentSiren: selectedEstablishment?.siren
    });
    return;
  }

  if (
    currentUser.suspendedAt === suspensionState.suspendedAt &&
    currentUser.suspendedCause === suspensionState.suspendedCause
  ) {
    return;
  }

  await userRepository.update({
    ...currentUser,
    ...suspensionState
  });

  logger.info('User suspension synchronized from Portail DF', {
    userId: user.id,
    email: user.email,
    establishmentId: selectedEstablishment?.id,
    previousSuspendedCause: currentUser.suspendedCause,
    nextSuspendedCause: suspensionState.suspendedCause
  });
}

function haveSameEstablishments(
  currentEstablishments: Array<{ establishmentId: string }>,
  authorizedEstablishments: AuthorizedEstablishment[]
): boolean {
  const currentIds = new Set(
    currentEstablishments.map((establishment) => establishment.establishmentId)
  );
  const authorizedIds = new Set(
    authorizedEstablishments.map(
      (establishment) => establishment.establishmentId
    )
  );

  return (
    currentIds.size === authorizedIds.size &&
    [...currentIds].every((id) => authorizedIds.has(id))
  );
}

async function syncAuthorizedEstablishments(
  user: UserApi,
  authorizedEstablishments: AuthorizedEstablishment[]
): Promise<void> {
  const currentAuthorized =
    await userEstablishmentRepository.getAuthorizedEstablishments(user.id);

  if (haveSameEstablishments(currentAuthorized, authorizedEstablishments)) {
    logger.debug('No changes to authorized establishments for user', {
      userId: user.id,
      email: user.email
    });
    return;
  }

  logger.info('Updating authorized establishments for user at login', {
    userId: user.id,
    email: user.email,
    previousCount: currentAuthorized.length,
    newCount: authorizedEstablishments.length,
    previousIds: currentAuthorized.map(
      (establishment) => establishment.establishmentId
    ),
    newIds: authorizedEstablishments.map(
      (establishment) => establishment.establishmentId
    )
  });

  await userEstablishmentRepository.setAuthorizedEstablishments(
    user.id,
    authorizedEstablishments
  );

  const hasMultipleCommittedEstablishments =
    authorizedEstablishments.filter(
      (establishment) => establishment.hasCommitment
    ).length > 1;
  if (hasMultipleCommittedEstablishments) {
    logger.info('User identified as multi-structure at login', {
      userId: user.id,
      email: user.email,
      authorizedEstablishmentsCount: authorizedEstablishments.length
    });
  }
}

async function saveAuthorizedEstablishmentPerimeters(
  user: UserApi,
  authorizedEstablishments: ReadonlyArray<AuthorizedEstablishment>,
  knownEstablishments: ReadonlyArray<EstablishmentApi>,
  ceremaUsers: ReadonlyArray<CeremaUser>
): Promise<void> {
  for (const authorizedEstablishment of authorizedEstablishments) {
    const establishment = knownEstablishments.find(
      (candidate) => candidate.id === authorizedEstablishment.establishmentId
    );
    if (!establishment) {
      continue;
    }

    const ceremaUser = findCeremaUser(ceremaUsers, establishment.siren);
    const perimeter = ceremaUser?.perimeter;
    if (!perimeter) {
      continue;
    }

    await userPerimeterRepository.upsert({
      userId: user.id,
      establishmentId: establishment.id,
      geoCodes: perimeter.comm || [],
      departments: perimeter.dep || [],
      regions: perimeter.reg || [],
      epci: perimeter.epci || [],
      frEntiere: perimeter.fr_entiere || false,
      updatedAt: new Date().toJSON()
    });

    logger.info('User perimeter saved from Portail DF', {
      userId: user.id,
      email: user.email,
      establishmentId: establishment.id,
      frEntiere: perimeter.fr_entiere,
      communesCount: perimeter.comm?.length || 0,
      departmentsCount: perimeter.dep?.length || 0,
      regionsCount: perimeter.reg?.length || 0,
      epciCount: perimeter.epci?.length || 0
    });
  }
}

/**
 * Refresh authorized establishments for a user from Portail DF.
 * This is called at login to keep the users_establishments table in sync
 * with current Portail DF rights.
 *
 * Also verifies access rights (LOVAC access level + geographic perimeter)
 * and suspends user if rights are no longer valid.
 */
export async function refreshAuthorizedEstablishments(
  user: UserApi,
  options: RefreshOptions = {}
): Promise<void> {
  try {
    const ceremaUsers = await ceremaService.consultUsers(user.email);

    if (ceremaUsers.length === 0) {
      logger.info('No Portail DF rights found for user at login', {
        userId: user.id,
        email: user.email
      });
      if (options.authoritative) {
        await syncAuthorizedEstablishments(user, []);
      }
      return;
    }

    const selectedEstablishmentId =
      options.establishmentId ?? user.establishmentId;
    const selectedEstablishment = selectedEstablishmentId
      ? await establishmentRepository.get(selectedEstablishmentId)
      : null;
    const { incompleteCeremaUsers, syncableCeremaUsers } =
      splitCeremaUsers(ceremaUsers);
    const incompleteSelectedCeremaUsers = selectedEstablishment
      ? incompleteCeremaUsers.filter((ceremaUser) =>
          matchesCeremaSiren(ceremaUser, selectedEstablishment.siren)
        )
      : [];

    if (incompleteSelectedCeremaUsers.length > 0) {
      logger.warn(
        'Skipping Portail DF synchronization with incomplete selected establishment details',
        {
          userId: user.id,
          email: user.email,
          establishmentId: selectedEstablishment?.id,
          failedEntries: getFailedCeremaEntries(incompleteSelectedCeremaUsers)
        }
      );
      if (options.authoritative) {
        throw new ExternalServiceUnavailableError('Portail DF');
      }
      return;
    }

    const ceremaUsersWithCommitment = syncableCeremaUsers.filter(
      (ceremaUser) => ceremaUser.hasCommitment
    );
    const establishmentSirens = ceremaUsersWithCommitment.map(
      (ceremaUser) => ceremaUser.establishmentSiren
    );

    const knownEstablishments = await establishmentRepository.find({
      filters: { siren: establishmentSirens }
    });
    const { authorizedEstablishments, accessErrors } =
      await authorizeEstablishments(
        user,
        knownEstablishments,
        syncableCeremaUsers,
        selectedEstablishment
      );

    if (selectedEstablishment) {
      await syncCeremaSuspension(
        user,
        selectedEstablishment,
        syncableCeremaUsers,
        accessErrors
      );
    }
    await saveAuthorizedEstablishmentPerimeters(
      user,
      authorizedEstablishments,
      knownEstablishments,
      syncableCeremaUsers
    );

    if (incompleteCeremaUsers.length > 0) {
      logger.warn(
        'Skipping authorized establishments synchronization with incomplete Portail DF details',
        {
          userId: user.id,
          email: user.email,
          failedEntries: getFailedCeremaEntries(incompleteCeremaUsers)
        }
      );
      if (options.authoritative) {
        throw new ExternalServiceUnavailableError('Portail DF');
      }
      return;
    }

    await syncAuthorizedEstablishments(user, authorizedEstablishments);
  } catch (error) {
    // Log error but don't fail login
    logger.error('Failed to refresh authorized establishments at login', {
      userId: user.id,
      email: user.email,
      error
    });
    if (options.authoritative) {
      throw new ExternalServiceUnavailableError('Portail DF');
    }
  }
}
