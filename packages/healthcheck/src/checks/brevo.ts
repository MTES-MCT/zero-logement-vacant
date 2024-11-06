import { Check } from './check';

export function brevoCheck(apiKey: string): Check {
  return {
    name: 'brevo',
    async test() {
      const url =
        'https://api.brevo.com/v3/smtp/statistics/aggregatedReport';
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'api-key': apiKey
        }
      };
      await fetch(url, options).then(res => {
        if(res.status !== 200) {
          throw new Error('Brevo API is not available');
        }
      });
    }
  };
}
