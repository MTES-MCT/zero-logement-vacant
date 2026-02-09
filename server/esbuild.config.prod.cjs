const { tsconfigPathsPlugin } = require('esbuild-plugin-tsconfig-paths');

module.exports = {
  sourcemap: false,
  plugins: [
    tsconfigPathsPlugin({
      cwd: __dirname,
      tsconfig: 'tsconfig.json'
    })
  ],
  outExtension: {
    '.js': '.js'
  }
};
