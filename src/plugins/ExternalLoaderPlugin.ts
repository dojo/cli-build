import Compiler = require('webpack/lib/Compiler');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

export type ExternalDescriptor = {
	name?: string

	/**
	 * This is used to specify the location, relative to node_modules, from where the dependency should be copied.
	 */
	from: string;

	/**
	 * This can be used to specify the location, relative to the externals folder, where the dependency should be copied.
	 */
	to?: string;

	/**
	 * Whether to load this script, or script(s) within this dependency. If true, `to` or `from` should point to a
	 * file to load on the page. If this is a string, it should point to the file to load.
	 */
	inject?: boolean | string | string[];
};

/**
 * Describes an external dependency
 */
export type ExternalDep = string | ExternalDescriptor;

export default class ExternalDojoLoaderPlugin {
	private _externals: ExternalDep[];
	private _outputPath: string;
	private _loaderFile?: string;
	private _pathPrefix: string;

	constructor(options: {
		externals: ExternalDep[],
		outputPath?: string;
		pathPrefix?: string;
		loaderFile?: string;
		loadForTests?: string[];
	}) {
		const { externals, outputPath, loaderFile, pathPrefix } = options;
		this._externals = externals;
		this._outputPath = outputPath || 'externals';
		this._loaderFile = loaderFile;
		this._pathPrefix = pathPrefix ? `${pathPrefix}/` : '';
	}

	apply(compiler: Compiler) {
		const toInject = this._externals.reduce((assets, external) => {
			if (typeof external === 'string') {
				return assets;
			}

			const { inject, to, from } = external;
			const base = to || from;

			if (!inject) {
				return assets;
			}

			if (Array.isArray(inject)) {
				return assets.concat(inject.map(path => `${this._outputPath}/${base}/${path}`));
			}

			const location = (typeof inject === 'string' && `${base}/${inject}`) || to || from;

			return assets.concat(`${this._outputPath}/${location}`);
		}, [] as string[]);

		compiler.apply(new CopyWebpackPlugin(
			this._externals.reduce((config, external) => typeof external === 'string' ? config : config.concat([ {
				from: `node_modules/${external.from}`,
				to: `${this._pathPrefix}${this._outputPath}/${external.to || external.from}`

			} ]), [] as { from: string, to: string, transform?: Function }[]).concat(
				this._loaderFile ? {
					from: this._loaderFile,
					to: `${this._pathPrefix}loadMain.js`,
					transform: (content: any) => {
						const source = content.toString();
						if (this._pathPrefix) {
							return source.replace(/\.[/]src/g, `./`);
						}
						else {
							return source;
						}
					}
				} : []
			)
		));
		compiler.apply(
			new HtmlWebpackIncludeAssetsPlugin({
				assets: toInject.concat(this._loaderFile ? `loadMain.js` : []),
				append: true,
				files: 'index.html'
			})
		);
		compiler.apply(
			new HtmlWebpackIncludeAssetsPlugin({
			assets: toInject.map(path => '../_build/src/' + path).concat(this._loaderFile ? `../_build/src/loadMain.js` : []),
			append: true,
			files: '../_build/src/index.html'
		}));
	}
}
