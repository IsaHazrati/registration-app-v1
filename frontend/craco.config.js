const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        alias: {
          ...webpackConfig.resolve.alias,
          '@': path.resolve(__dirname, 'src'),
        },
      };
      return webpackConfig;
    },
  },
};