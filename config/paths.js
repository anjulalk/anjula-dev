const path = require('path')

module.exports = {
  // Source files
  src: path.resolve(__dirname, '../src'),

  // Production build
  build: path.resolve(__dirname, '../dist'),

  // Static files copied to production build
  public: path.resolve(__dirname, '../public'),
}
