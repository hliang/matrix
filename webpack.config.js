const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

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
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "index.html", to: "." }, // Copy index.html to dist
        { from: "lib", to: "lib" }, // Copy lib folder to dist
      ],
    }),
  ],
};