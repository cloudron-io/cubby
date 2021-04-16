module.exports = {
  publicPath: '/',
  pages: {
    index: {
      // entry for the page
      entry: 'frontend/index.js',
      // the source template
      template: 'frontend/index.html',
      // output as dist/index.html
      filename: 'index.html',
      // chunks to include on this page, by default includes
      // extracted common chunks and vendor chunks.
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    }
  }
};
