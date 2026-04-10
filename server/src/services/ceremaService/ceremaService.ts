import axios from 'axios';
import {
  CeremaGroup,
  CeremaPerimeter,
  CeremaUser,
  ConsultUserService
} from './consultUserService';
import { createAuthProvider, AuthResult } from './ceremaAuthProvider';

import { logger } from '~/infra/logger';

/**
 * Check if a LOVAC access date is valid (in the future).
 */
function isLovacAccessValid(accesLovac: string | null): boolean {
  if (!accesLovac) {
    return false;
  }

  try {
    const accessDate = new Date(accesLovac);
    const now = new Date();
    return accessDate > now;
  } catch {
    return false;
  }
}

/**
 * Check if a group has LOVAC access.
 * A group has LOVAC access if:
 * - niveau_acces is 'lovac', OR
 * - the lovac boolean flag is true
 */
function hasGroupLovacAccess(group: CeremaGroup | undefined): boolean {
  if (!group) {
    return false;
  }
  return group.niveau_acces === 'lovac' || group.lovac === true;
}

function authHeaders(auth: AuthResult) {
  return {
    Authorization: `${auth.authPrefix} ${auth.token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Make an authenticated API call to Portail DF
 */
async function fetchPortailDF<T>(
  auth: AuthResult,
  endpoint: string
): Promise<T | null> {
  try {
    const { data } = await axios.get<T>(`${auth.apiUrl}${endpoint}`, {
      headers: authHeaders(auth)
    });
    return data;
  } catch (error) {
    logger.warn('Failed to fetch from Portail DF', { endpoint, error });
    return null;
  }
}

export class CeremaService implements ConsultUserService {
  private authProvider = createAuthProvider();

  async consultUsers(email: string): Promise<CeremaUser[]> {
    try {
      const auth = await this.authProvider.authenticate();

      const { data: userContent } = await axios.get<{
        results: Array<{ email: string; structure: number; groupe: number }>;
      }>(`${auth.apiUrl}/api/utilisateurs`, {
        params: { email },
        headers: authHeaders(auth)
      });

      if (userContent) {
        const users = await Promise.all(
          userContent.results.map(
            async (user: { email: any; structure: number; groupe: number }) => {
              const { data: establishmentContent } = await axios.get<any>(
                `${auth.apiUrl}/api/structures/${user.structure}`,
                { headers: authHeaders(auth) }
              );

              // Fetch group info if available
              let group: CeremaGroup | undefined;
              let perimeter: CeremaPerimeter | undefined;

              if (user.groupe) {
                group =
                  (await fetchPortailDF<CeremaGroup>(
                    auth,
                    `/api/groupes/${user.groupe}/`
                  )) ?? undefined;

                // Fetch perimeter if group has one
                if (group?.perimetre) {
                  perimeter =
                    (await fetchPortailDF<CeremaPerimeter>(
                      auth,
                      `/api/perimetres/${group.perimetre}/`
                    )) ?? undefined;
                }
              }

              // hasCommitment is true only if:
              // 1. Structure has a valid LOVAC access date (future date)
              // 2. AND user's group has LOVAC access (niveau_acces === 'lovac' OR lovac === true)
              const structureHasLovac = isLovacAccessValid(
                establishmentContent.acces_lovac
              );
              const groupHasLovac = hasGroupLovacAccess(group);

              logger.debug('LOVAC access check', {
                email: user.email,
                structureId: user.structure,
                accesLovac: establishmentContent.acces_lovac,
                structureHasLovac,
                groupId: user.groupe,
                groupNiveauAcces: group?.niveau_acces,
                groupLovac: group?.lovac,
                groupHasLovac,
                hasCommitment: structureHasLovac && groupHasLovac
              });

              const u: CeremaUser = {
                email: user.email,
                establishmentSiren: establishmentContent.siret.substring(0, 9),
                hasAccount: true,
                hasCommitment: structureHasLovac && groupHasLovac,
                group,
                perimeter
              };
              return u;
            }
          )
        );
        return users;
      }
      return [];
    } catch (error) {
      logger.error(error);
      return [];
    }
  }
}

export default function createCeremaService(): CeremaService {
  return new CeremaService();
}
