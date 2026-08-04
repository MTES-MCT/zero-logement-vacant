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
  title.textContent = 'Une ressource n’a pas pu être chargée';

  description.textContent =
    'Rechargez la page pour continuer. Vous retrouverez la page en cours.';

  button.type = 'button';
  button.className = 'fr-btn fr-mt-2w';
  button.textContent = 'Recharger l’application';
  button.addEventListener('click', reload, { once: true });

  alert.append(title, description, button);
  document.body.prepend(alert);
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

  const onPreloadError = (event: Event) => {
    if (recoveryPending) {
      event.preventDefault();
      return;
    }

    const currentTime = now();
    let storage: Pick<Storage, 'getItem' | 'setItem'>;

    try {
      storage = getStorage();
      const storedReloadAt = storage.getItem(PRELOAD_ERROR_RELOAD_KEY);
      const lastReloadAt = storedReloadAt ? Number(storedReloadAt) : null;

      if (lastReloadAt !== null && Number.isFinite(lastReloadAt)) {
        const elapsed = currentTime - lastReloadAt;

        if (elapsed >= 0 && elapsed < PRELOAD_ERROR_RELOAD_COOLDOWN) {
          return;
        }
      }
    } catch {
      return;
    }

    try {
      showRecovery(reload);
    } catch {
      return;
    }

    try {
      storage.setItem(PRELOAD_ERROR_RELOAD_KEY, currentTime.toString());
    } catch {
      // Recovery is already visible. A missing cooldown is preferable to
      // hiding the only action that can restore a stale application.
    }

    recoveryPending = true;
    event.preventDefault();
  };

  eventTarget.addEventListener('vite:preloadError', onPreloadError);

  return () => {
    eventTarget.removeEventListener('vite:preloadError', onPreloadError);
  };
}
