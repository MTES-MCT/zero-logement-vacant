import { boolean, number, object, string } from 'yup';

const schema = object({
  api: object({
    url: string().default('http://localhost:3001')
  }),
  ban: object({
    url: string().url().default('https://api-adresse.data.gouv.fr'),
    eligibleScore: number().default(0.8)
  }),
  metabase: object({
    siteURL: string().url().optional(),
    public: object({
      statsDashboard: string().optional()
    })
  }),
  posthog: object({
    enabled: boolean().default(false),
    apiKey: string().optional()
  }).when({
    is: (posthog: { enabled: boolean }) => posthog.enabled,
    then: (schema) =>
      schema.shape({
        apiKey: string().required(
          'PostHog API key is required when PostHog is enabled'
        )
      })
  }),
  sentry: object({
    enabled: boolean().default(false),
    sampleRate: number().min(0).max(1).default(0.2),
    tracesSampleRate: number().min(0).max(1).default(0.2)
  }).when({
    is: (sentry: { enabled: boolean }) => sentry.enabled,
    then: (schema) =>
      schema.shape({
        dsn: string()
          .url()
          .required('Sentry DSN is required when Sentry is enabled'),
        env: string().required(
          'Sentry environment is required when Sentry is enabled'
        )
      })
  })
});

const config = schema.validateSync({
  api: {
    url: import.meta.env.VITE_API_URL
  },
  ban: {
    url: import.meta.env.VITE_BAN_URL,
    eligibleScore: import.meta.env.VITE_BAN_ELIGIBLE_SCORE
  },
  metabase: {
    siteURL: import.meta.env.VITE_METABASE_SITE_URL,
    public: {
      statsDashboard: import.meta.env.VITE_METABASE_STATS_DASHBOARD
    }
  },
  posthog: {
    enabled: import.meta.env.VITE_POSTHOG_ENABLED,
    apiKey: import.meta.env.VITE_POSTHOG_API_KEY
  },
  sentry: {
    enabled: import.meta.env.VITE_SENTRY_ENABLED,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    env: import.meta.env.VITE_SENTRY_ENV,
    sampleRate: import.meta.env.VITE_SENTRY_SAMPLE_RATE,
    tracesSampleRate: import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
  }
});


interface Config {
  apiEndpoint: string;
  banEndpoint: string;
  metabase: {
    siteUrl?: string;
    public: {
      statsDashboard?: string;
    };
  };
  perPageDefault: number;
  posthog: {
    enabled: boolean;
    apiKey: string;
  };
  sentry: {
    enabled: boolean;
    dsn?: string;
    env: string;
    sampleRate: number;
    tracesSampleRate: number;
  };
  banEligibleScore: number;
}

export default {
  apiEndpoint: config.api.url,
  banEligibleScore: config.ban.eligibleScore,
  banEndpoint: config.ban.url,
  metabase: {
    siteUrl: config.metabase.siteURL,
    public: {
      statsDashboard: config.metabase.public.statsDashboard
    }
  },
  perPageDefault: 50,
  posthog: {
    enabled: config.posthog.enabled,
    apiKey: config.posthog.enabled ? config.posthog.apiKey as string : ''
  },
  sentry: {
    enabled: config.sentry.enabled,
    dsn: (config.sentry as any).dsn,
    env: (config.sentry as any).env,
    sampleRate: config.sentry.sampleRate,
    tracesSampleRate: config.sentry.tracesSampleRate
  }
} satisfies Config;
