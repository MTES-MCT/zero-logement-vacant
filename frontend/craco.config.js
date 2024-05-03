// eslint-disable-next-line import/no-commonjs
module.exports = {
  babel: {
    loaderOptions: {
      // Avoid transpiling maplibre-gl because the production build yields some undefined value.
      // See https://github.com/alex3165/react-mapbox-gl/issues/931
      // See https://github.com/mapbox/mapbox-gl-js/issues/10565
      // eslint-disable-next-line import/no-webpack-loader-syntax
      ignore: ['./node_modules/maplibre-gl/dist/maplibre-gl.js'],
    },
  },
  jest: {
    configure(config) {
      config.rootDir = '.';
      config.setupFilesAfterEnv = [
        'jest-extended/all',
        '<rootDir>/src/setupTests.ts',
      ];
      config.transformIgnorePatterns = [
        '<rootDir>/node_modules/(?!@codegouvfr)/.+\\.js$',
      ];
      return config;
    },
  },
};
