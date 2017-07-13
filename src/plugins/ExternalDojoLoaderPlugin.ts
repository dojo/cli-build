import Compiler = require('webpack/lib/Compiler');
import * as path from 'path';
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');


export type DojoDependencyDescriptor = {
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
	packages?: string[];

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

/**
 * Describes a dependency on a Dojo 1 module, project, or layer file.
 */
export type DojoDependency = true | string[] | DojoDependencyDescriptor;

export interface ExternalDojoDependencyConfig<T = DojoDependency> {
	[ dependency: string ]: T;
}

export default class ExternalDojoLoaderPlugin {
	private _externals?: ExternalDojoDependencyConfig<DojoDependencyDescriptor>;
	private _externalConfig?: { [ key: string ]: any };
	constructor(options: { externals?: ExternalDojoDependencyConfig, externalConfig?: { [ key: string ]: any } } = {}) {
		const { externals, externalConfig } = options;
		if (externals) {
			this._externals = Object.keys(externals).reduce((newExternals, key) => {
				const config = externals[key];
				if (config === true) {
					newExternals[key] = {};
				}
				else if (Array.isArray(config)) {
					newExternals[key] = { packages: config };
				}
				else {
					newExternals[key] = config;
				}

				return newExternals;
			}, {} as ExternalDojoDependencyConfig<DojoDependencyDescriptor>);
		}
		this._externalConfig = externalConfig;
	}

	apply(compiler: Compiler) {
		const externals = this._externals || {};
		const loaderModule = this.determineLoaderModule(externals);

		compiler.apply(new CopyWebpackPlugin(this.createCopyConfig(externals, loaderModule)));
		compiler.apply(new HtmlWebpackIncludeAssetsPlugin(this.createHtmlAssetsConfig(externals, loaderModule)));
	}

	createCopyConfig(externals: ExternalDojoDependencyConfig<DojoDependencyDescriptor>, loaderModule?: string) {
		const config = [
			...Object.keys(externals).map((module) => ({
				from: `node_modules/${module}`,
				to: this.getDirectoryToCopyTo(externals, module)
			})),
			{
				from: path.join(__dirname, '../templates/requireExternals.js'),
				to: 'externals/requireExternals.js',
				transform: (content: any) => content.toString()
					.replace(
						'/* External Config */',
						this._externalConfig && `${JSON.stringify(this._externalConfig)}, ` || ''
					)
					.replace('/* External Layer MIDs */', this.getMIDs(externals, loaderModule))
			}
		];

		if (!loaderModule) {
			config.push({ from: path.join(__dirname, '../node_modules/dojo'), to: 'externals/dojo' });
		}

		return config;
	}

	createHtmlAssetsConfig(externals: ExternalDojoDependencyConfig<DojoDependencyDescriptor>, loaderModule?: string) {
		const path = loaderModule && this.getPath(loaderModule, externals[loaderModule], true);
		return {
			assets: [
				`externals/${path || 'dojo/dojo.js'}`,
				'externals/requireExternals.js'
			],
		append: false };
	}

	determineLoaderModule(externals: ExternalDojoDependencyConfig<DojoDependencyDescriptor>) {
		return Object.keys(externals).reduce((prev: string | undefined, next: string) => {
			if (prev) {
				return prev;
			}

			const config = externals[next];

			if (config && config.hasLoader) {
				return next;
			}
		}, undefined);
	}

	getDirectoryToCopyTo(externals: ExternalDojoDependencyConfig<DojoDependencyDescriptor>, module: string) {
		const config = externals[module];
		if (config && config.to) {
			return `externals/${config.to}`;
		}

		return `externals/${module}`;
	}

	getMIDs(externals: ExternalDojoDependencyConfig<DojoDependencyDescriptor>, loaderModule?: string) {
		return Object.keys(externals).filter((module) => module !== loaderModule)
			.reduce((mids, module) => {
				const config = externals[module];

				if (config && config.fetchImmediately) {
					mids.push(`'${this.getPath(module, config, false)}'`);
				}

				return mids;
			}, [] as string[])
			.concat([ `'../src/main.js'` ])
			.join(', ');
	}

	getPath(module: string, dependency: DojoDependencyDescriptor, includeExtension?: boolean) {
		const base = dependency.to ? dependency.to : module;
		const path = dependency.main ? `${base}/${dependency.main}` : base;
		const hasExtension = /\.js$/.test(path);
		return includeExtension ?
			(hasExtension ? path : (path + '.js')) : (hasExtension ? path.replace(/\.js$/, '') : path);
	}
}
