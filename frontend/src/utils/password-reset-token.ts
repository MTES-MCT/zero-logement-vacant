export const PASSWORD_RESET_PATH = '/mot-de-passe/nouveau';

const PASSWORD_RESET_TOKEN_HISTORY_STATE_KEY = 'zlv.password-reset-token';

let protectedPasswordResetToken = '';

type PasswordResetLocation = Pick<Location, 'hash' | 'pathname' | 'search'>;
type PasswordResetHistory = Pick<History, 'replaceState' | 'state'>;

function isHistoryState(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function protectPasswordResetToken(
  location: PasswordResetLocation = window.location,
  history: PasswordResetHistory = window.history
): boolean {
  if (location.pathname !== PASSWORD_RESET_PATH || !location.hash) {
    return true;
  }

  protectedPasswordResetToken = location.hash.slice(1);
  try {
    const currentState = history.state;
    const nextState = {
      ...(isHistoryState(currentState) ? currentState : {}),
      [PASSWORD_RESET_TOKEN_HISTORY_STATE_KEY]: protectedPasswordResetToken
    };
    history.replaceState(
      nextState,
      '',
      `${location.pathname}${location.search}`
    );
    return true;
  } catch {
    // The URL fragment and the one-shot in-memory fallback keep the flow
    // usable, but callers must not start third-party telemetry while the secret
    // remains visible in the URL.
    return false;
  }
}

export function readPasswordResetToken(
  pathname: string,
  hash: string,
  history: Pick<History, 'state'> = window.history
): string {
  if (pathname !== PASSWORD_RESET_PATH) {
    protectedPasswordResetToken = '';
    return '';
  }

  const fallbackToken = protectedPasswordResetToken;
  protectedPasswordResetToken = '';

  if (hash) {
    return hash.slice(1);
  }
  try {
    const state = history.state;
    const token = isHistoryState(state)
      ? state[PASSWORD_RESET_TOKEN_HISTORY_STATE_KEY]
      : undefined;
    return typeof token === 'string' ? token : fallbackToken;
  } catch {
    return fallbackToken;
  }
}

export function clearPasswordResetToken(
  history: PasswordResetHistory = window.history
): void {
  protectedPasswordResetToken = '';
  try {
    const state = history.state;
    if (
      !isHistoryState(state) ||
      !(PASSWORD_RESET_TOKEN_HISTORY_STATE_KEY in state)
    ) {
      return;
    }

    const nextState = { ...state };
    delete nextState[PASSWORD_RESET_TOKEN_HISTORY_STATE_KEY];
    history.replaceState(nextState, '');
  } catch {
    // History can be unavailable in privacy modes; the in-memory token is clear.
  }
}
