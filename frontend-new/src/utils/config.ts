const config = {
  apiEndpoint: process.env.REACT_APP_API_URL ?? 'http://localhost:3001',
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  matomo: {
    urlBase: process.env.REACT_APP_MATOMO_URL_BASE ?? '',
    siteId: Number(process.env.REACT_APP_MATOMO_SITE_ID) ?? 0,
    srcUrl: process.env.REACT_APP_MATOMO_SRC_URL,
    disabled: process.env.NODE_ENV !== 'production',
    linkTracking: true,
  },
  metabase: {
    siteUrl: process.env.REACT_APP_METABASE_SITE_URL,
    public: {
      statsDashboard: process.env.REACT_APP_METABASE_STATS_DASHBOARD,
    },
  },
  perPageDefault: 50,
  dataYear: 2022,
  banEligibleScore: 0.8,
  feature: {
    /**
     * @example
     * REACT_APP_FEATURE_OCCUPANCY=ct1,ct2,ct3
     */
    occupancy: (process.env.REACT_APP_FEATURE_OCCUPANCY ?? '')
      .split(',')
      .map((element) => element.trim()),
  },
};

export default config;
