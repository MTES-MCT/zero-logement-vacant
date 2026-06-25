import { logger } from '~/infra/logger';
import { UserApi } from '~/models/UserApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import userRepository from '~/repositories/userRepository';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import ceremaService from '~/services/ceremaService';
import {
  verifyAccessRights,
  accessErrorsToSuspensionCause
} from '~/services/ceremaService/perimeterService';

/**
 * Refresh authorized establishments for a user from Portail DF.
 * This is called at login to keep the users_establishments table in sync
 * with current Portail DF rights.
 *
 * Also verifies access rights (LOVAC access level + geographic perimeter)
 * and suspends user if rights are no longer valid.
 */
export async function refreshAuthorizedEstablishments(
  user: UserApi
): Promise<void> {
  try {
    // Fetch current rights from Portail DF
    const ceremaUsers = await ceremaService.consultUsers(user.email);

    if (ceremaUsers.length === 0) {
      logger.info('No Portail DF rights found for user at login', {
        userId: user.id,
        email: user.email
      });
      return;
    }

    // Filter users with valid LOVAC commitment
    const ceremaUsersWithCommitment = ceremaUsers.filter(
      (cu) => cu.hasCommitment
    );
    const establishmentSirens = ceremaUsersWithCommitment.map(
      (cu) => cu.establishmentSiren
    );

    // Find all known establishments matching the SIRENs
    const knownEstablishments = await establishmentRepository.find({
      filters: { siren: establishmentSirens }
    });

    // Build authorized establishments list with access rights verification
    const authorizedEstablishments: Array<{
      establishmentId: string;
      establishmentSiren: string;
      hasCommitment: boolean;
    }> = [];

    const accessErrors: string[] = [];

    for (const est of knownEstablishments) {
      const ceremaUser = ceremaUsersWithCommitment.find(
        (cu) =>
          cu.establishmentSiren === est.siren || cu.establishmentSiren === '*'
      );

      if (ceremaUser) {
        // Verify access rights for this establishment (pass SIREN for EPCI perimeter check)
        const accessRights = await verifyAccessRights(
          ceremaUser,
          est.geoCodes,
          est.siren
        );

        if (accessRights.isValid) {
          authorizedEstablishments.push({
            establishmentId: est.id,
            establishmentSiren: est.siren,
            hasCommitment: ceremaUser.hasCommitment
          });
        } else {
          logger.warn(
            'Access rights verification failed for establishment at login',
            {
              userId: user.id,
              email: user.email,
              establishmentId: est.id,
              establishmentSiren: est.siren,
              errors: accessRights.errors
            }
          );
          accessErrors.push(...accessRights.errors);
        }
      }
    }

    // Check if user's current establishment lost access rights
    if (user.establishmentId) {
      const currentEstablishmentStillValid = authorizedEstablishments.some(
        (e) => e.establishmentId === user.establishmentId
      );

      if (!currentEstablishmentStillValid && accessErrors.length > 0) {
        // Suspend user if their current establishment lost access
        const suspensionCause = accessErrorsToSuspensionCause([
          ...new Set(accessErrors)
        ] as any);

        logger.warn('Suspending user at login due to lost access rights', {
          userId: user.id,
          email: user.email,
          establishmentId: user.establishmentId,
          suspensionCause
        });

        // Re-fetch user to get latest lastAuthenticatedAt (updated by signIn)
        const currentUser = await userRepository.get(user.id);
        if (currentUser) {
          await userRepository.update({
            ...currentUser,
            suspendedAt: new Date().toJSON(),
            suspendedCause: suspensionCause
          });
        }
      }
    }

    // Get current authorized establishments for comparison
    const currentAuthorized =
      await userEstablishmentRepository.getAuthorizedEstablishments(user.id);
    const currentIds = new Set(currentAuthorized.map((e) => e.establishmentId));
    const newIds = new Set(
      authorizedEstablishments.map((e) => e.establishmentId)
    );

    // Check if there are changes
    const hasChanges =
      currentIds.size !== newIds.size ||
      [...currentIds].some((id) => !newIds.has(id)) ||
      [...newIds].some((id) => !currentIds.has(id));

    if (hasChanges) {
      logger.info('Updating authorized establishments for user at login', {
        userId: user.id,
        email: user.email,
        previousCount: currentAuthorized.length,
        newCount: authorizedEstablishments.length,
        previousIds: [...currentIds],
        newIds: [...newIds]
      });

      // Update authorized establishments
      await userEstablishmentRepository.setAuthorizedEstablishments(
        user.id,
        authorizedEstablishments
      );

      // Log multi-structure status
      const isMultiStructure =
        authorizedEstablishments.filter((e) => e.hasCommitment).length > 1;
      if (isMultiStructure) {
        logger.info('User identified as multi-structure at login', {
          userId: user.id,
          email: user.email,
          authorizedEstablishmentsCount: authorizedEstablishments.length
        });
      }
    } else {
      logger.debug('No changes to authorized establishments for user', {
        userId: user.id,
        email: user.email
      });
    }

    // Save user perimeter from Portail DF for filtering
    // Use the perimeter from the user's current establishment
    if (user.establishmentId) {
      const currentEstablishment = knownEstablishments.find(
        (est) => est.id === user.establishmentId
      );
      if (currentEstablishment) {
        const currentCeremaUser = ceremaUsersWithCommitment.find(
          (cu) =>
            cu.establishmentSiren === currentEstablishment.siren ||
            cu.establishmentSiren === '*'
        );

        if (currentCeremaUser?.perimeter) {
          const perimeter = currentCeremaUser.perimeter;
          await userPerimeterRepository.upsert({
            userId: user.id,
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
            frEntiere: perimeter.fr_entiere,
            communesCount: perimeter.comm?.length || 0,
            departmentsCount: perimeter.dep?.length || 0,
            regionsCount: perimeter.reg?.length || 0,
            epciCount: perimeter.epci?.length || 0
          });
        }
      }
    }
  } catch (error) {
    // Log error but don't fail login
    logger.error('Failed to refresh authorized establishments at login', {
      userId: user.id,
      email: user.email,
      error
    });
  }
}
