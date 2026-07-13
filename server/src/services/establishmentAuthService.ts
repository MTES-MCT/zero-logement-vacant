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
  accessErrorsToSuspensionCause,
  type AccessRightsError
} from '~/services/ceremaService/perimeterService';

interface AuthorizedEstablishment {
  establishmentId: string;
  establishmentSiren: string;
  hasCommitment: boolean;
}

interface AuthorizationResult {
  authorizedEstablishments: AuthorizedEstablishment[];
  accessErrors: AccessRightsError[];
}

function findCeremaUser(
  ceremaUsers: ReadonlyArray<CeremaUser>,
  establishmentSiren: string
): CeremaUser | undefined {
  return ceremaUsers.find(
    (ceremaUser) =>
      ceremaUser.establishmentSiren === establishmentSiren ||
      ceremaUser.establishmentSiren === '*'
  );
}

async function authorizeEstablishments(
  user: UserApi,
  knownEstablishments: ReadonlyArray<EstablishmentApi>,
  ceremaUsers: ReadonlyArray<CeremaUser>
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
    accessErrors.push(...accessRights.errors);
  }

  return { authorizedEstablishments, accessErrors };
}

async function suspendIfCurrentEstablishmentLostAccess(
  user: UserApi,
  authorizedEstablishments: AuthorizedEstablishment[],
  accessErrors: AccessRightsError[]
): Promise<void> {
  const currentEstablishmentStillValid = authorizedEstablishments.some(
    (establishment) => establishment.establishmentId === user.establishmentId
  );
  if (
    !user.establishmentId ||
    currentEstablishmentStillValid ||
    accessErrors.length === 0
  ) {
    return;
  }

  const suspensionCause = accessErrorsToSuspensionCause([
    ...new Set(accessErrors)
  ]);

  logger.warn('Suspending user at login due to lost access rights', {
    userId: user.id,
    email: user.email,
    establishmentId: user.establishmentId,
    suspensionCause
  });

  // Re-fetch user to get latest lastAuthenticatedAt (updated by signIn)
  const currentUser = await userRepository.get(user.id);
  if (!currentUser) {
    return;
  }

  await userRepository.update({
    ...currentUser,
    suspendedAt: new Date().toJSON(),
    suspendedCause: suspensionCause
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
  options: { authoritative?: boolean } = {}
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

    const ceremaUsersWithCommitment = ceremaUsers.filter(
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
        ceremaUsersWithCommitment
      );

    await suspendIfCurrentEstablishmentLostAccess(
      user,
      authorizedEstablishments,
      accessErrors
    );
    await syncAuthorizedEstablishments(user, authorizedEstablishments);
    await saveAuthorizedEstablishmentPerimeters(
      user,
      authorizedEstablishments,
      knownEstablishments,
      ceremaUsersWithCommitment
    );
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
