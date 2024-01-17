const config = {
  apiEndpoint: process.env.REACT_APP_API_URL,
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  matomo: {
    urlBase: process.env.REACT_APP_MATOMO_URL_BASE,
    siteId: process.env.REACT_APP_MATOMO_SITE_ID,
    srcUrl: process.env.REACT_APP_MATOMO_SRC_URL,
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
