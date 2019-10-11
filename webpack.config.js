module.exports = {
  entry: ['babel-polyfill',__dirname + "/src/app.js"],
  output: {
    path:  __dirname,
    filename: 'waveform-playlist.var.js',
    library: 'WaveformPlaylist',
    libraryTarget: 'var'
  },
  devtool: "#source-map",
  module: {
    loaders: [{
      test: /\.js?$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  }
};