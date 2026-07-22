import type { EstablishmentDTO } from './EstablishmentDTO';

/**
 * The authenticated user as exposed by better-auth's `getSession` (and the
 * client's `useSession()`). Intentionally narrow: identity + role only.
 *
 * NOT the same as `UserDTO` from the admin/user-management endpoints:
 * - `role` is the string form (`'usual' | 'admin' | 'visitor'`), not the
 *   numeric `UserRole` enum. This matches better-auth's convention so
 *   server-side code aligns with the standard. Frontend adapters that
 *   still need the legacy enum (e.g. `useUser` during the v1→v2
 *   transition) map at the boundary.
 * - No `establishmentId` on the user — the active establishment lives on
 *   `SessionDTO.session.activeEstablishmentId`.
 * - No phone / position / timePerWeek / activatedAt / etc. Those are fetched
 *   on demand from `/api/account` or `/api/users/:id` by the views that need
 *   them. Suspension status (`suspendedAt` / `suspendedCause`) IS included so
 *   the client can render the suspended-user warning without an extra fetch.
 */
export type AuthRole = 'usual' | 'admin' | 'visitor';

export interface AuthUserDTO {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  firstName: string | null;
  lastName: string | null;
  role: AuthRole;
  /** Suspension date, or null when the account is active. */
  suspendedAt: string | null;
  /** Suspension cause(s), or null when the account is active. */
  suspendedCause: string | null;
}

/**
 * Server-augmented session payload returned by `GET /auth/get-session`
 * (better-auth's `customSession` plugin in `server/src/infra/auth.ts`) and
 * consumed by the frontend through `authClient.useSession()`.
 *
 * Single source of truth for the session shape — used as the return type
 * of the customSession fn on the server and the type of
 * `useSession().data` on the client.
 */
export interface SessionDTO {
  user: AuthUserDTO;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    activeEstablishmentId: string | null;
  };
  establishment: EstablishmentDTO | null;
  authorizedEstablishments: readonly EstablishmentDTO[];
  /**
   * Establishment geo codes intersected with the user's perimeter.
   * Undefined when no restriction applies (ADMIN, VISITOR, or no perimeter
   * configured). Use this for any locality-scoped filtering on the client.
   */
  effectiveGeoCodes?: string[];
}
