import posthog from 'posthog-js';

import config from './config';
import { initCrisp } from './crisp';
import { PASSWORD_RESET_PATH } from './password-reset-token';
import sentry from './sentry';

type TelemetryLocation = Pick<Location, 'hash' | 'pathname'>;

export function createTelemetryStarter(initialize: () => void) {
  let started = false;

  return (location: TelemetryLocation): boolean => {
    if (
      !started &&
      location.pathname === PASSWORD_RESET_PATH &&
      location.hash
    ) {
      return false;
    }
    if (!started) {
      started = true;
      initialize();
    }
    return true;
  };
}

function initializeTelemetry(): void {
  initCrisp();
  sentry.init();
  if (config.posthog.enabled) {
    posthog.init(config.posthog.apiKey, {
      api_host: 'https://eu.i.posthog.com',
      person_profiles: 'identified_only'
    });
  }
}

export const startTelemetryWhenSafe =
  createTelemetryStarter(initializeTelemetry);
