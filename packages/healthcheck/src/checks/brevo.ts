import { Check } from './check';

interface BrevoCheckOptions {
  enable?: boolean;
}

export function brevoCheck(apiKey: string, options?: BrevoCheckOptions): Check {
  return {
    name: 'brevo',
    async test() {
      if (options?.enable === false) {
        // Pass through
        return Promise.resolve();
      }

      try {
        await fetch('https://api.brevo.com/v3/smtp/statistics/aggregatedReport', {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'api-key': apiKey
          },
          signal: AbortSignal.timeout(2000),
        }).then((res) => {
          if (res.status !== 200) {
            throw new Error('Brevo API is not available');
          }
        });
      } catch {
        throw new Error('Brevo API is not available');
      }
    }
  };
}
