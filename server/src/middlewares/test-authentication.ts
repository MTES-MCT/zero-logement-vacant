import type { Request } from 'express';

export const TEST_USER_ID_HEADER = 'x-zlv-test-user-id';
export const TEST_ESTABLISHMENT_ID_HEADER = 'x-zlv-test-establishment-id';

interface TestAuthentication {
  userId: string;
  activeEstablishmentId: string;
}

function readHeader(request: Request, name: string): string | null {
  const value = request.headers[name];
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}

/**
 * Test-only adapter for controller tests that need an authenticated request.
 * Production never accepts these headers, even if a client sends them.
 */
export function readTestAuthentication(
  request: Request
): TestAuthentication | null {
  if (process.env.VITEST !== 'true' || process.env.NODE_ENV === 'production') {
    return null;
  }

  const userId = readHeader(request, TEST_USER_ID_HEADER);
  const activeEstablishmentId = readHeader(
    request,
    TEST_ESTABLISHMENT_ID_HEADER
  );

  return userId && activeEstablishmentId
    ? { userId, activeEstablishmentId }
    : null;
}
