export const PASSWORD_RESET_PATH = '/mot-de-passe/nouveau';
export const PASSWORD_RESET_TOKEN_STORAGE_KEY = 'zlv.password-reset-token';

let protectedPasswordResetToken = '';

type PasswordResetLocation = Pick<Location, 'hash' | 'pathname' | 'search'>;
type PasswordResetHistory = Pick<History, 'replaceState' | 'state'>;
type PasswordResetStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;
type PasswordResetStorageProvider<T extends keyof PasswordResetStorage> =
  () => Pick<PasswordResetStorage, T>;

function browserSessionStorage(): PasswordResetStorage {
  return window.sessionStorage;
}

export function protectPasswordResetToken(
  location: PasswordResetLocation = window.location,
  history: PasswordResetHistory = window.history,
  storage: PasswordResetStorageProvider<'setItem'> = browserSessionStorage
): void {
  if (location.pathname !== PASSWORD_RESET_PATH || !location.hash) {
    return;
  }

  protectedPasswordResetToken = location.hash.slice(1);
  try {
    storage().setItem(
      PASSWORD_RESET_TOKEN_STORAGE_KEY,
      protectedPasswordResetToken
    );
  } catch {
    // Some privacy modes disable storage. The in-memory fallback still lets the
    // current page consume the token after it has been removed from the URL.
  }
  history.replaceState(
    history.state,
    '',
    `${location.pathname}${location.search}`
  );
}

export function readPasswordResetToken(
  pathname: string,
  hash: string,
  storage: PasswordResetStorageProvider<'getItem'> = browserSessionStorage
): string {
  if (hash) {
    return hash.slice(1);
  }
  if (pathname !== PASSWORD_RESET_PATH) {
    return '';
  }
  try {
    return (
      storage().getItem(PASSWORD_RESET_TOKEN_STORAGE_KEY) ??
      protectedPasswordResetToken
    );
  } catch {
    return protectedPasswordResetToken;
  }
}

export function clearPasswordResetToken(
  storage: PasswordResetStorageProvider<'removeItem'> = browserSessionStorage
): void {
  protectedPasswordResetToken = '';
  try {
    storage().removeItem(PASSWORD_RESET_TOKEN_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy modes; the in-memory token is clear.
  }
}
