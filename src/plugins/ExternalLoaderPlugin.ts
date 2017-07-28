import Compiler = require('webpack/lib/Compiler');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

export type ExternalDescriptor = {
	/**
	 * The path that will be used to load this module. This property is used to configure the build to defer to the
	 * external loader.
	 */
	name?: string
	/**
	 * If this is a boolean, it indicates whether to inject this dependency into the application. If inject is set to
	 * true, this dependency should be a script or stylesheet. If this dependency is a directory and contains one or
	 * more stylesheets or scripts that  should be injected into the application inject can be set to a string or array
	 * of strings that point to the resource(s) to be injected. Only scripts and stylehseets can be injected.
	 */
	inject?: boolean | string | string[];

	/**
	 * Optional property to indicate how this external should be loaded
	 */
	type?: string;

	/**
	 * This is used to specify the location, relative to the project root, from where the dependency should be copied.
	 */
	from?: string;

	/**
	 * This can be used to specify the location, relative to the externals folder, where the dependency should be copied.
	 */
	to?: string;
};

/**
 * Describes an external dependency
 */
export type ExternalDep = string | ExternalDescriptor;

export default class ExternalDojoLoaderPlugin {
	private _externals: ExternalDep[];
	private _outputPath: string;
	private _pathPrefix: string;
	private _hash: boolean;

	constructor(options: {
		externals: ExternalDep[],
		outputPath?: string;
		pathPrefix?: string;
		hash?: boolean

	}) {
		const { externals, outputPath, pathPrefix, hash } = options;
		this._externals = externals;
		this._outputPath = outputPath || 'externals';
		this._hash = Boolean(hash);
		this._pathPrefix = pathPrefix ? `${pathPrefix}/` : '';
	}

	apply(compiler: Compiler) {
		const prefixPath = (path: string) => `${this._pathPrefix}${this._outputPath}/${path}`;

		const toInject = this._externals.reduce((assets, external) => {
				if (typeof external === 'string') {
					return assets;
				}

				const { inject, to, from } = external;

				if (!inject || !from) {
					return assets;
				}

				const base = to || from;

				if (Array.isArray(inject)) {
					return assets.concat(inject.map(path => prefixPath(`${base}/${path}`)));
				}

				const location = (typeof inject === 'string' && `${base}/${inject}`) || to || from;

				return assets.concat(prefixPath(location));
			}, [] as string[]);

		compiler.apply(new CopyWebpackPlugin(
			this._externals.reduce((config, external) => (typeof external === 'string' || !external.from) ? config : config.concat([ {
				from: `${external.from}`,
				to: `${this._pathPrefix}${this._outputPath}/${external.to || external.from}`

			} ]), [] as { from: string, to: string, transform?: Function }[])
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
