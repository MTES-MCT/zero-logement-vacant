const config = {
  apiEndpoint: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  metabase: {
    siteUrl: import.meta.env.VITE_METABASE_SITE_URL,
    public: {
      statsDashboard: import.meta.env.VITE_METABASE_STATS_DASHBOARD
    }
  },
  perPageDefault: 50,
  posthog: {
    enabled:
      import.meta.env.VITE_POSTHOG_ENABLED !== undefined
        ? import.meta.env.VITE_POSTHOG_ENABLED === 'true'
        : process.env.NODE_ENV === 'production',
    apiKey: import.meta.env.VITE_POSTHOG_API_KEY ?? ''
  },
  sentry: {
    enabled:
      import.meta.env.VITE_SENTRY_ENABLED !== undefined
        ? import.meta.env.VITE_SENTRY_ENABLED === 'true'
        : process.env.NODE_ENV === 'production',
    dsn: import.meta.env.VITE_SENTRY_DSN,
    env:
      import.meta.env.VITE_SENTRY_ENV !== undefined
        ? import.meta.env.VITE_SENTRY_ENV
        : process.env.NODE_ENV === 'production'
          ? 'production'
          : 'development',
    sampleRate: import.meta.env.VITE_SAMPLE_RATE
      ? Number(import.meta.env.VITE_SAMPLE_RATE)
      : 0.2,
    tracesSampleRate: import.meta.env.VITE_TRACES_SAMPLE_RATE
      ? Number(import.meta.env.VITE_TRACES_SAMPLE_RATE)
      : 0.2
  },
  banEligibleScore: 0.8,
  feature: {
    /**
     * @example
     * REACT_APP_FEATURE_OCCUPANCY=ct1,ct2,ct3
     */
    occupancy: (import.meta.env.VITE_FEATURE_OCCUPANCY ?? '')
      .split(',')
      .map((element: string) => element.trim())
  }
};

export default config;
