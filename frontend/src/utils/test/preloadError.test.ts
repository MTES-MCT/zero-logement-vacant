import userEvent from '@testing-library/user-event';

import { registerPreloadErrorRecovery } from '../preloadError';

describe('Preload error recovery', () => {
  let unregister: (() => void) | undefined;
  let releaseModalFocusTrap: (() => void) | undefined;

  afterEach(() => {
    unregister?.();
    unregister = undefined;
    releaseModalFocusTrap?.();
    releaseModalFocusTrap = undefined;
    sessionStorage.clear();
    document.getElementById('vite-preload-error-recovery')?.remove();
    document.getElementById('preload-error-existing-control')?.remove();
    document.getElementById('preload-error-modal')?.remove();
  });

  it('should offer recovery only once when a stale dynamic import fails', () => {
    const reload = vi.fn();
    const showRecovery = vi.fn();
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery,
      now: () => 100_000
    });
    const firstEvent = new Event('vite:preloadError', { cancelable: true });
    const secondEvent = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(firstEvent);
    window.dispatchEvent(secondEvent);

    expect(firstEvent.defaultPrevented).toBeTrue();
    expect(secondEvent.defaultPrevented).toBeTrue();
    expect(showRecovery).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();

    showRecovery.mock.calls[0]?.[0]();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('should expose the normal error after a recovery attempt within the cooldown', () => {
    const firstShowRecovery = vi.fn();
    unregister = registerPreloadErrorRecovery({
      showRecovery: firstShowRecovery,
      now: () => 100_000
    });
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    unregister();

    const secondShowRecovery = vi.fn();
    unregister = registerPreloadErrorRecovery({
      showRecovery: secondShowRecovery,
      now: () => 100_000
    });
    const secondEvent = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(secondEvent);

    expect(firstShowRecovery).toHaveBeenCalledOnce();
    expect(secondShowRecovery).not.toHaveBeenCalled();
    expect(secondEvent.defaultPrevented).toBeFalse();
  });

  it('should allow a new recovery attempt after the cooldown', () => {
    const reload = vi.fn();
    const firstShowRecovery = vi.fn();
    let currentTime = 100_000;
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery: firstShowRecovery,
      now: () => currentTime
    });
    const firstEvent = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(firstEvent);
    unregister();

    currentTime += 60_001;
    const secondShowRecovery = vi.fn();
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery: secondShowRecovery,
      now: () => currentTime
    });
    const secondEvent = new Event('vite:preloadError', { cancelable: true });
    window.dispatchEvent(secondEvent);

    expect(secondEvent.defaultPrevented).toBeTrue();
    expect(firstShowRecovery).toHaveBeenCalledOnce();
    expect(secondShowRecovery).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should keep the error visible if the reload guard cannot be persisted', () => {
    const reload = vi.fn();
    unregister = registerPreloadErrorRecovery({
      reload,
      getStorage: () => {
        throw new DOMException('Storage is unavailable');
      }
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeFalse();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should offer recovery if the reload guard cannot be written', () => {
    const reload = vi.fn();
    const showRecovery = vi.fn();
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery,
      getStorage: () => ({
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Storage is read-only');
        }
      })
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(showRecovery).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should retry showing recovery when a previous attempt failed', () => {
    const showRecovery = vi.fn(() => {
      throw new Error('Recovery rendering failed');
    });
    unregister = registerPreloadErrorRecovery({
      showRecovery,
      now: () => 100_000
    });
    const firstEvent = new Event('vite:preloadError', { cancelable: true });
    const secondEvent = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(firstEvent);
    window.dispatchEvent(secondEvent);

    expect(showRecovery).toHaveBeenCalledTimes(2);
    expect(firstEvent.defaultPrevented).toBeFalse();
    expect(secondEvent.defaultPrevented).toBeFalse();
    expect(sessionStorage.getItem('zlv:preload-error-reload-at')).toBeNull();
  });

  it('should recover when the stored reload timestamp is corrupted', () => {
    const reload = vi.fn();
    const showRecovery = vi.fn();
    sessionStorage.setItem('zlv:preload-error-reload-at', '100000-corrupted');
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery,
      now: () => 100_000
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(showRecovery).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should recover when the stored reload timestamp is in the future', () => {
    const reload = vi.fn();
    const showRecovery = vi.fn();
    sessionStorage.setItem('zlv:preload-error-reload-at', '200000');
    unregister = registerPreloadErrorRecovery({
      reload,
      showRecovery,
      now: () => 100_000
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(showRecovery).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('should show an accessible reload action without moving the focus', () => {
    const reload = vi.fn();
    const existingControl = document.createElement('button');
    existingControl.id = 'preload-error-existing-control';
    document.body.append(existingControl);
    existingControl.focus();
    unregister = registerPreloadErrorRecovery({
      reload,
      now: () => 100_000
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    const alert = document.querySelector('[role="alert"]');
    const button = alert?.querySelector('button');
    expect(alert).toHaveAccessibleName('Une ressource n’a pas pu être chargée');
    expect(alert).toHaveTextContent('Une ressource n’a pas pu être chargée');
    expect(alert).toHaveTextContent(
      'Rechargez la page pour continuer. Vous retrouverez la page en cours.'
    );
    expect(button).toHaveAccessibleName('Recharger l’application');
    expect(existingControl).toHaveFocus();
    expect(alert?.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(reload).not.toHaveBeenCalled();

    button?.click();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('should keep the reload action keyboard-reachable when a DSFR modal is open', async () => {
    const user = userEvent.setup();
    const modal = document.createElement('dialog');
    const modalContent = document.createElement('div');
    const modalControl = document.createElement('button');
    modal.id = 'preload-error-modal';
    modal.className = 'fr-modal';
    modal.setAttribute('open', 'true');
    modalContent.className = 'fr-modal__content';
    modalControl.type = 'button';
    modalControl.textContent = 'Action de la modale';
    modalContent.append(modalControl);
    modal.append(modalContent);
    document.body.append(modal);
    const trapTabulation = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusables = Array.from(
        modal.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
      );
      const first = focusables[0];
      const last = focusables.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', trapTabulation);
    releaseModalFocusTrap = () => {
      window.removeEventListener('keydown', trapTabulation);
    };
    unregister = registerPreloadErrorRecovery({ now: () => 100_000 });
    modalControl.focus();

    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    await user.tab();

    const reloadButton = document.querySelector<HTMLButtonElement>(
      '#vite-preload-error-recovery button'
    );
    expect(reloadButton).toHaveFocus();

    await user.tab({ shift: true });

    expect(modalControl).toHaveFocus();
  });
});
