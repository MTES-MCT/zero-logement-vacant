const config = {
  apiEndpoint: process.env.REACT_APP_API_URL,
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  metabase: {
    siteUrl: process.env.REACT_APP_METABASE_SITE_URL,
    public: {
      statsDashboard: process.env.REACT_APP_METABASE_STATS_DASHBOARD
    }
  },
  perPageDefault: 50,
  posthog: {
    enabled:
      process.env.REACT_APP_POSTHOG_ENABLED !== undefined
        ? process.env.REACT_APP_POSTHOG_ENABLED === 'true'
        : process.env.NODE_ENV === 'production'
  },
  dataYear: 2023,
  banEligibleScore: 0.8,
  feature: {
    /**
     * @example
     * REACT_APP_FEATURE_OCCUPANCY=ct1,ct2,ct3
     */
    occupancy: (process.env.REACT_APP_FEATURE_OCCUPANCY ?? '')
      .split(',')
      .map((element) => element.trim())
  }
};

export default config;
