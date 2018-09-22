module.exports = {
  staticPath: './static',
  distPath: './dist',
  dev: {
    entry: {
      app: './src/main.js',
    },
    srcDir: './src',
    entryHtml: './src/index.html',
    outputDir: './dist',
    assetsPublicPath: '/',
    devServerPort: 8000,
    env: {
      PORT: process.env.PORT || 8000,
    },
  },
  node: {
    paths: {
      main: 'server/index.js',
    },
  },
};
