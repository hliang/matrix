const path = require('path');

module.exports = {
  entry: './js/main.js', // Adjust to match the app's entry file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|gif)$/, // Handle assets files
        type: 'asset/inline', // Embed as data URIs
      },
      {
        test: /\.(glsl|wgsl)$/,
        use: 'raw-loader' // Load shaders as strings
      },
    ],
  },
};