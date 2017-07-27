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

	/**
	 * Optional type to indicate how this external should be loaded
	 */
	type?: string;
};

/**
 * Describes an external dependency
 */
export type ExternalDep = string | ExternalDescriptor;

export default class ExternalDojoLoaderPlugin {
	private _externals: ExternalDep[];
	private _outputPath: string;
	private _pathPrefix: string;
	private _loaderConfigurer?: string;
	private _hash: boolean;

	constructor(options: {
		externals: ExternalDep[],
		outputPath?: string;
		pathPrefix?: string;
		loaderConfigurer?: string;
		hash?: boolean

	}) {
		const { externals, outputPath, pathPrefix, loaderConfigurer, hash } = options;
		this._externals = externals;
		this._outputPath = outputPath || 'externals';
		this._pathPrefix = pathPrefix ? `${pathPrefix}/` : '';
		this._loaderConfigurer = loaderConfigurer;
		this._hash = Boolean(hash);
	}

	apply(compiler: Compiler) {
		const prefixPath = (path: string) => `${this._pathPrefix}${this._outputPath}/${path}`;

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
				return assets.concat(inject.map(path => prefixPath(`${base}/${path}`)));
			}

			const location = (typeof inject === 'string' && `${base}/${inject}`) || to || from;

			return assets.concat(prefixPath(location));
		}, [] as string[]).concat(this._loaderConfigurer ? `${this._outputPath}/${this._loaderConfigurer}` : []);

		compiler.apply(new CopyWebpackPlugin(
			this._externals.reduce((config, external) => typeof external === 'string' ? config : config.concat([ {
					from: `node_modules/${external.from}`,
					to: `${this._pathPrefix}${this._outputPath}/${external.to || external.from}`

				} ]), [] as { from: string, to: string, transform?: Function }[])
				.concat(this._loaderConfigurer ? { from: this._loaderConfigurer, to: `${this._outputPath}/${this._loaderConfigurer}` } : [])
		));
		compiler.apply(
			new HtmlWebpackIncludeAssetsPlugin({
				assets: toInject,
				append: false,
				files: `${this._pathPrefix}index.html`,
				hash: this._hash
			})
		);
	}
}
