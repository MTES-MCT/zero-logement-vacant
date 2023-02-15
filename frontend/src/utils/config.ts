const config = {
  apiEndpoint: process.env.REACT_APP_API_URL,
  banEndpoint: 'https://api-adresse.data.gouv.fr',
  publicStatsUrl: process.env.REACT_APP_PUBLIC_STATS_URL,
  matomo: {
    urlBase: process.env.REACT_APP_MATOMO_URL_BASE,
    siteId: process.env.REACT_APP_MATOMO_SITE_ID,
    srcUrl: process.env.REACT_APP_MATOMO_SRC_URL,
    linkTracking: true,
  },
  perPageDefault: 50,
  dataYear: 2021,
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
