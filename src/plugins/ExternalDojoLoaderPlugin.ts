import Compiler = require('webpack/lib/Compiler');
import * as path from 'path';
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

/**
 * Describes a dependency on a Dojo 1 module, project, or layer file.
 */
export type DojoDependency = true | string[] | {
	/**
	 * The path to the main file to be loaded. Can be provided if this dependency is a folder.
	 * If not provided, `main.js` will be loaded by default.
	 */
	main?: string;
	/**
	 * Optional flag indicating whether this module includes a loader. If no module contains a loader an un-built Dojo
	 * loader will be included in the build.
	 */
	hasLoader?: boolean;
	/**
	 * A List of packages defined by this dependency. This is used to populate the externals config. Any packages
	 * that are defined by this dependency and imported in the application but not included in this list or will not
	 * work. A DojoDependency that is an array of strings is equivalent to only defining this property.
	 *
	 */
	packages: string[];

	/**
	 * This can be used to specify the location, relative to the externals folder, where the dependency should be copied.
	 */
	to?: string;

	/**
	 * If this dependency should be required immediately, this property can be set to true. This is useful for eagerly
	 * loading layer files so that its modules will be available immediately.
	 */
	fetchImmediately?: boolean;
};

export interface ExternalDojoDependencyConfig {
	[ dependency: string ]: DojoDependency;
}

export default class ExternalDojoLoaderPlugin {
	private _externals?: ExternalDojoDependencyConfig;
	private _externalConfig?: { [ key: string ]: any };
	constructor(options: { externals?: ExternalDojoDependencyConfig, externalConfig?: { [ key: string ]: any } }) {
		const { externals, externalConfig } = options;
		this._externals = externals;
		this._externalConfig = externalConfig;
	}

	apply(compiler: Compiler) {
		const externals = this._externals || {};
		const externalModules = Object.keys(externals);
		const loaderModule = externalModules.reduce((prev: string | undefined, next: string) => {
			if (prev) {
				return prev;
			}

			const config = externals[next];

			if (config && !Array.isArray(config) && typeof config !== 'boolean' && config.hasLoader) {
				return next;
			}
		}, undefined);
		const mids = externalModules.filter((module) => module !== loaderModule)
			.reduce((mids, module) => {
				const config = externals[module];

				if (config && !Array.isArray(config) && typeof config !== 'boolean' && config.fetchImmediately) {
					const base = (config.to || module).replace('.js', '');
					mids.push(config.main ? `'${base}/${config.main}'` : `'${base}'`);
				}

				return mids;
			}, [] as string[])
			.concat([ `'../src/main.js'` ])
			.join(', ');

		function getDirectoryToCopyTo(module: string) {
			const config = externals[module];
			if (config && !Array.isArray(config) && typeof config !== 'boolean' && config.to) {
				return `externals/${config.to}`;
			}

			return `externals/${module}`;
		}

		const copyConfig = [
			...externalModules.map((module) => ({ from: `node_modules/${module}`, to: getDirectoryToCopyTo(module) })),
			{
				from: path.join(__dirname, '../templates/requireExternals.js'),
				to: 'externals/requireExternals.js',
				transform: (content: any) => content.toString()
					.replace(
						'/* External Config */',
						this._externalConfig && `${JSON.stringify(this._externalConfig)}, ` || ''
					)
					.replace('/* External Layer MIDs */', mids)
			}
		];

		if (!loaderModule) {
			copyConfig.push({ from: path.join(__dirname, '../node_modules/dojo'), to: 'externals/dojo' });
		}

		compiler.apply(new CopyWebpackPlugin(copyConfig));
		compiler.apply(new HtmlWebpackIncludeAssetsPlugin({
			assets: [
				`externals/${loaderModule ? `${loaderModule}/` : '' }dojo/dojo.js`,
				'externals/requireExternals.js'
			],
			append: false
		}));
	}
}
