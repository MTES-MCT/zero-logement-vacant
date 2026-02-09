const { tsconfigPathsPlugin } = require('esbuild-plugin-tsconfig-paths');

module.exports = {
  sourcemap: true,
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
