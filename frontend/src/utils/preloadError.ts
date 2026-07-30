const PRELOAD_ERROR_RELOAD_KEY = 'zlv:preload-error-reload-at';
const PRELOAD_ERROR_RELOAD_COOLDOWN = 60_000;
const PRELOAD_ERROR_RECOVERY_ID = 'vite-preload-error-recovery';

function showDefaultRecovery(reload: () => void): void {
  if (document.getElementById(PRELOAD_ERROR_RECOVERY_ID)) {
    return;
  }

  const alert = document.createElement('section');
  const title = document.createElement('p');
  const description = document.createElement('p');
  const button = document.createElement('button');

  alert.id = PRELOAD_ERROR_RECOVERY_ID;
  alert.className = 'fr-alert fr-alert--warning fr-m-2w';
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-labelledby', `${PRELOAD_ERROR_RECOVERY_ID}-title`);

  title.id = `${PRELOAD_ERROR_RECOVERY_ID}-title`;
  title.className = 'fr-alert__title';
  title.textContent = 'L’application a été mise à jour';

  description.textContent =
    'Rechargez la page pour continuer. Vous retrouverez la page en cours.';

  button.type = 'button';
  button.className = 'fr-btn fr-mt-2w';
  button.textContent = 'Recharger l’application';
  button.addEventListener('click', reload, { once: true });

  alert.append(title, description, button);
  document.body.prepend(alert);
  button.focus();
}

interface PreloadErrorRecoveryOptions {
  eventTarget?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  getStorage?: () => Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
  reload?: () => void;
  showRecovery?: (reload: () => void) => void;
}

export function registerPreloadErrorRecovery(
  options: PreloadErrorRecoveryOptions = {}
): () => void {
  const eventTarget = options.eventTarget ?? window;
  const getStorage = options.getStorage ?? (() => window.sessionStorage);
  const now = options.now ?? Date.now;
  const reload = options.reload ?? (() => window.location.reload());
  const showRecovery = options.showRecovery ?? showDefaultRecovery;
  let recoveryPending = false;

  const onPreloadError = () => {
    if (recoveryPending) {
      return;
    }

    const currentTime = now();

    try {
      const storage = getStorage();
      const storedReloadAt = storage.getItem(PRELOAD_ERROR_RELOAD_KEY);
      const lastReloadAt = storedReloadAt ? Number(storedReloadAt) : null;

      if (lastReloadAt !== null && Number.isFinite(lastReloadAt)) {
        const elapsed = currentTime - lastReloadAt;

        if (elapsed >= 0 && elapsed < PRELOAD_ERROR_RELOAD_COOLDOWN) {
          return;
        }
      }

      storage.setItem(PRELOAD_ERROR_RELOAD_KEY, currentTime.toString());
    } catch {
      return;
    }

    try {
      showRecovery(reload);
    } catch {
      return;
    }

    recoveryPending = true;
  };

  eventTarget.addEventListener('vite:preloadError', onPreloadError);

  return () => {
    eventTarget.removeEventListener('vite:preloadError', onPreloadError);
  };
}
