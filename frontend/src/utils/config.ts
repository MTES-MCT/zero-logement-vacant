const config = {
  apiEndpoint: import.meta.env.REACT_APP_API_URL,
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  matomo: {
    enabled:
      import.meta.env.REACT_APP_MATOMO_ENABLED !== undefined
        ? import.meta.env.REACT_APP_MATOMO_ENABLED === 'true'
        : import.meta.env.NODE_ENV === 'production',
    urlBase: import.meta.env.REACT_APP_MATOMO_URL_BASE ?? 'http://localhost',
    siteId: import.meta.env.REACT_APP_MATOMO_SITE_ID
      ? Number(import.meta.env.REACT_APP_MATOMO_SITE_ID)
      : 1,
    srcUrl: import.meta.env.REACT_APP_MATOMO_SRC_URL,
    linkTracking: true
  },
  metabase: {
    siteUrl: import.meta.env.REACT_APP_METABASE_SITE_URL,
    public: {
      statsDashboard: import.meta.env.REACT_APP_METABASE_STATS_DASHBOARD
    }
  },
  perPageDefault: 50,
  posthog: {
    enabled:
      import.meta.env.REACT_APP_POSTHOG_ENABLED !== undefined
        ? import.meta.env.REACT_APP_POSTHOG_ENABLED === 'true'
        : import.meta.env.NODE_ENV === 'production'
  },
  dataYear: 2023,
  banEligibleScore: 0.8,
  feature: {
    /**
     * @example
     * REACT_APP_FEATURE_OCCUPANCY=ct1,ct2,ct3
     */
    occupancy: (import.meta.env.REACT_APP_FEATURE_OCCUPANCY ?? '')
      .split(',')
      .map((element: string) => element.trim())
  }
};

export default config;
