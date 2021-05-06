const HtmlWebpackPlugin = require("html-webpack-plugin")
const PnpWebpackPlugin = require(`pnp-webpack-plugin`);
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path')

const javascriptRules = {
  test: /\.js$/,
  exclude: /node_modules | .yarn/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: ['@babel/preset-env']
    }
  }
}
const typescriptRules = {
  test: /\.tsx?$/,
  use: 'ts-loader',
  exclude: /node_modules/,
}
const cssRules = {
  test: /\.css$/i,
  use: ['style-loader', 'css-loader'],
}

const fileRules = {
  test: /\.(png|jpe?g|gif|mp3)$/i,
  use: [
    {
      loader: 'file-loader',      
    },
  ],
}

module.exports = (env, { mode }) => ({
  mode: 'development',
  output: {
    filename: 'app[contenthash].js',
    path: path.resolve(__dirname, 'build'),
  },
  module: {
    rules: [
      javascriptRules,
      typescriptRules,
      cssRules,
      fileRules,
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [PnpWebpackPlugin],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'RxJs Pokedex',
      template: 'public/index.html'
    }),
    new CopyWebpackPlugin({
      patterns:[
      {from:'*.gif',to:'images/',context: "public/"},
      {from:'*.css',to:'./',context: "public/"},      
      {from:'*',to:'fonts/',context: "public/fonts"},
    ]}), 
  ],
  resolveLoader: {
    plugins: [PnpWebpackPlugin.moduleLoader(module)],
  },
})

