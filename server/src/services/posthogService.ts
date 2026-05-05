import { PostHog } from 'posthog-node';
import config from '~/infra/config';

const posthog = new PostHog(config.posthog.apiKey, {
  host: config.posthog.host,
});

export async function isFeatureEnabled(
  flag: string,
  distinctId: string
): Promise<boolean> {
  return (await posthog.isFeatureEnabled(flag, distinctId)) === true;
}

export default posthog;
