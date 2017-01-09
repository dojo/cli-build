const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const Config = require('webpack-config').default;
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer-sunburst').BundleAnalyzerPlugin;
const path = require('path');
const basePath = process.cwd();

module.exports = function (args) {
	args = args || {};

	const sourcePlugins = [
		new webpack.ContextReplacementPlugin(/dojo-app[\\\/]lib/, { test: () => false }),
		new ExtractTextPlugin('main.css'),
		new CopyWebpackPlugin([
			{ context: 'src', from: '**/*', ignore: '*.ts' },
		]),
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false }}),
		new HtmlWebpackPlugin ({
			inject: true,
			chunks: [ 'src/main' ],
			template: 'src/index.html'
		})
	];

	if (!args.watch) {
		sourcePlugins.push(new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			openAnalyzer: false,
			reportType: 'sunburst'
		}));
	}

	const baseConfig = function() {
        return new Config().merge({
            devtool: 'source-map',
            resolve: {
                root: [ basePath ],
                extensions: ['', '.ts', '.tsx', '.js'],
                alias: {
                    rxjs: '@reactivex/rxjs/dist/amd'
                }
            },
            resolveLoader: {
                root: [ path.join(__dirname, 'node_modules') ]
            },
            module: {
                preLoaders: [
                    {
                        test: /dojo-.*\.js$/,
                        loader: 'source-map-loader'
                    }
                ],
                loaders: [
                    { test: /src[\\\/].*\.ts?$/, loader: 'umd-compat-loader!ts-loader' },
                    { test: /\.js?$/, loader: 'umd-compat-loader' },
                    { test: /\.html$/, loader: 'html' },
                    { test: /\.(jpe|jpg|png|woff|woff2|eot|ttf|svg)(\?.*$|$)/, loader: 'file?name=[path][name].[hash:6].[ext]' },
                    { test: /\.styl$/, loader: ExtractTextPlugin.extract(['css-loader?sourceMap', 'stylus-loader']) },
                    { test: /\.css$/, loader: 'style-loader!css-loader?modules' },
                ]
            }
        });
    };
	const webpackConfigs = [ baseConfig().merge({
        entry: {
            'src/main': [
                path.join(basePath, 'src/main.styl'),
                path.join(basePath, 'src/main.ts')
            ]
        },
        plugins: sourcePlugins,
        output: {
            path: path.resolve('./dist'),
            filename: '[name].js'
        }
    }) ];
	if (args.withTests) {
        webpackConfigs.push(baseConfig().merge({
            externals: [
                function (context, request, callback) {
                    if (/^intern[!\/]/.test(request)) {
                        return callback(null, "amd " + request);
                    }
                    callback();
                }
            ],
            entry: {
                'unit/all': 'tests/unit/all.ts',
                'functional/all': 'tests/functional/all.ts'
            },
            plugins: [
                new CopyWebpackPlugin([
                    {context: 'tests', from: '**/*', ignore: '*.ts'},
                ])
            ],
            output: {
                libraryTarget: "amd",
                path: path.resolve('./_build/tests'),
                filename: '[name].js'
            }
        }));
    }
    return webpackConfigs;
}
