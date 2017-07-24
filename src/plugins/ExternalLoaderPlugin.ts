import Compiler = require('webpack/lib/Compiler');
const CopyWebpackPlugin = require('copy-webpack-plugin');
import ExternalLoaderUmdTemplatePlugin from './ExternalLoaderUmdTemplatePlugin';

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
};

/**
 * Describes an external dependency
 */
export type ExternalDep = string | ExternalDescriptor;

export default class ExternalDojoLoaderPlugin {
	private _externals: ExternalDep[];
	public name: string | string[] | { root?: string, amd?: string, commonjs?: string };
	private loaderMap: Map<string, string>;
	private namedDefine: boolean;

	constructor(options: {
		namedDefine?: boolean,
		name?: any,
		externals?: ExternalDep[],
		loaderMap?: Map<string, string>;
	} = {}) {
		const { externals, name, loaderMap } = options;
		this.loaderMap = loaderMap || new Map<string, string>();
		this._externals = externals || [];
		this.name = name;
		this.namedDefine = Boolean(options.namedDefine);
	}

	apply(compiler: Compiler) {
		compiler.apply(new CopyWebpackPlugin(this._externals.reduce(
			(config, external) => typeof external === 'string' ? config : config.concat([ {
				from: `node_modules/${external.from}`,
				to: `externals/${external.to || external.from}`

			} ]),
			[] as { from: string, to: string }[]
		)));
		compiler.plugin('this-compilation', (compilation) => {
			compilation.apply(new ExternalLoaderUmdTemplatePlugin({
				loaderMap: this.loaderMap,
				name: this.name,
				namedDefine: this.namedDefine
			}));
		});
	}
}
