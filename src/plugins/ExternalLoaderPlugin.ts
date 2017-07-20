import Compiler = require('webpack/lib/Compiler');
import Compilation = require('webpack/lib/Compilation');
import Map from '@dojo/shim/Map';
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ConcatSource = require('webpack-sources').ConcatSource;
const OriginalSource = require('webpack-sources').OriginalSource;

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

function accessorToObjectAccess(accessor: any[]) {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join('');
}

function accessorAccess(base: string, accessor: any[]) {
	accessor = (<any> []).concat(accessor);
	return accessor.map((a, idx) => {
		a = base + accessorToObjectAccess(accessor.slice(0, idx + 1));
		if (idx === accessor.length - 1) {
			return a;
		}
		return `${a} = ${a} || {}`;
	}).join(', ');
}

class ExternalsWrapperPlugin {
	private name: string;
	private names: { [ index: string ]: any };
	private namedDefine: boolean;
	private loaderMap: Map<string, string>;

	constructor(options: { loaderMap: Map<string, string>, namedDefine?: boolean, name?: any }) {
		const { name, loaderMap, namedDefine } = options;
		if (typeof name === 'object' && !Array.isArray(name)) {
			this.name = name.root || name.amd || name.commonjs;
			this.names = name;
		} else {
			this.name = name;
			this.names = {
				commonjs: name,
				root: name,
				amd: name
			};
		}
		this.namedDefine = Boolean(namedDefine);
		this.loaderMap = loaderMap;
	}

	apply(this: any, compilation: any) {
		const mainTemplate: any = compilation.mainTemplate;
		compilation.templatesPlugin('render-with-entry', (source: string, chunk: any, hash: string) => {
			const externals = chunk.modules.filter((m: any) => m.external);
			let defaultExternals = externals.filter((m: any) => !this.loaderMap.has(m.request));
			const customExternals = externals.filter((m: any) => this.loaderMap.has(m.request));
			const optionalExternals: any[] = [];
			let requiredExternals: any[] = [];
			if (this.optionalAmdExternalAsGlobal) {
				defaultExternals.forEach((m: any) => {
					if (m.optional) {
						optionalExternals.push(m);
					} else {
						requiredExternals.push(m);
					}
				});
				defaultExternals = requiredExternals.concat(optionalExternals);
			} else {
				requiredExternals = defaultExternals;
			}

			function replaceKeys(str?: string) {
				return mainTemplate.applyPluginsWaterfall('asset-path', str, {
					hash,
					chunk
				});
			}

			function externalsDepsArray(modules: any[]) {
				return `[${replaceKeys(modules.map(m => JSON.stringify(typeof m.request === 'object' ? m.request.amd : m.request)).join(', '))}]`;
			}

			function externalsRootArray(modules: any[]) {
				return replaceKeys(modules.map(m => {
					let request = m.request;
					if (typeof request === 'object') {
						request = request.root;
					}
					return `root${accessorToObjectAccess([].concat(request))}`;
				}).join(', '));
			}

			function externalsRequireArray(type: string) {
				return replaceKeys(defaultExternals.map((m: any) => {
					let expr;
					let request = m.request;
					if (typeof request === 'object') {
						request = request[ type ];
					}
					if (typeof request === 'undefined') {
						throw new Error('Missing external configuration for type:' + type);
					}
					if (Array.isArray(request)) {
						expr = `require(${JSON.stringify(request[ 0 ])})${accessorToObjectAccess(request.slice(1))}`;
					} else {
						expr = `require(${JSON.stringify(request)})`;
					}
					if (m.optional) {
						expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
					}
					return expr;
				}).join(', '));
			}

			function externalsArguments(modules: any[]) {
				return modules.map(m => `__WEBPACK_EXTERNAL_MODULE_${m.id}__`).join(', ');
			}

			function libraryName(library: string[]) {
				return JSON.stringify(replaceKeys((<string[]> []).concat(library).pop()));
			}

			let amdFactory;
			if (optionalExternals.length > 0) {
				const wrapperArguments = externalsArguments(requiredExternals);
				const factoryArguments = requiredExternals.length > 0 ?
					externalsArguments(requiredExternals) + ', ' + externalsRootArray(optionalExternals) :
					externalsRootArray(optionalExternals);
				amdFactory = `function webpackLoadOptionalExternalModuleAmd(${wrapperArguments}) {\n` +
					`			return factory(${factoryArguments});\n` +
					'		}';
			} else {
				amdFactory = 'factory';
			}

			const customExternalLoaders: { [ type: string ]: any[] } = {};
			customExternals.forEach((m: any) => {
				const type = this.loaderMap.get(m.request);
				customExternalLoaders[type] = customExternalLoaders[type] || [];
				customExternalLoaders[type].push(m);
			});
			const keys = Object.keys(customExternalLoaders);
			const orderedExternalModules = keys.reduce((prev, next) => {
				return prev.concat(customExternalLoaders[next]);
			}, [] as any[]);

			function wrapInCustomLoad(umdWrapper: string) {
				const check = 'if (typeof dojoExternalModulesLoader === "undefined") {\nrunWebpackUMD(root, factory);\n}\nelse {\n';
				const load = keys.map((key) => {
					return `dojoExternalModulesLoader.load('${key}', [ ${customExternalLoaders[key].map((m: any) => `'${m.request}'`).join(', ')} ]);\n`;
				});
				const wait = 'dojoExternalModulesLoader.waitForActiveLoads().then(function (modules) {\n' +
						'factory = factory.bind.apply(factory, [ null ].concat(modules));\n' +
						'runWebpackUMD(root, factory);\n})\n}\n';
				return check + load + wait + 'function runWebpackUMD(root, factory) {\n' + umdWrapper + '\n}\n';
			}

			return new ConcatSource(new OriginalSource(
				'(function webpackUniversalModuleDefinition(root, factory) {\n' +
				wrapInCustomLoad(
					'	if(typeof exports === "object" && typeof module === "object")\n' +
					'		module.exports = factory(' + externalsRequireArray('commonjs2') + ');\n' +
					'	else if(typeof define === "function" && define.amd)\n' +
					(requiredExternals.length > 0 ?
							(this.names.amd && this.namedDefine === true ?
									'		define(' + libraryName(this.names.amd) + ', ' + externalsDepsArray(requiredExternals) + ', ' + amdFactory + ');\n' :
									'		require(' + externalsDepsArray(requiredExternals) + ', ' + amdFactory + ');\n'
							) :
							(this.names.amd && this.namedDefine === true ?
									'		define(' + libraryName(this.names.amd) + ', [], ' + amdFactory + ');\n' :
									'		require([], ' + amdFactory + ');\n'
							)
					) +
					(this.names.root || this.names.commonjs ?
							'	else if(typeof exports === "object")\n' +
							'		exports[' + libraryName(this.names.commonjs || this.names.root) + '] = factory(' + externalsRequireArray('commonjs') + ');\n' +
							'	else\n' +
							'		' + replaceKeys(accessorAccess('root', this.names.root || this.names.commonjs)) + ' = factory(' + externalsRootArray(defaultExternals) + ');\n' :
							'	else {\n' +
							(defaultExternals.length > 0 ?
									'		var a = typeof exports === "object" ? factory(' + externalsRequireArray('commonjs') + ') : factory(' + externalsRootArray(defaultExternals) + ');\n' :
									'		var a = factory();\n'
							) +
							'		for(var i in a) (typeof exports === "object" ? exports : root)[i] = a[i];\n' +
							'	}\n'
					)
				) +
				'})(this, function(' + externalsArguments(orderedExternalModules.concat(defaultExternals)) + ') {\nreturn ', 'webpack/universalModuleDefinition'), source, ';\n})');
		});
		mainTemplate.plugin('global-hash-paths', (paths: any[]) => {
			if (this.names.root) {
				paths = paths.concat(this.names.root);
			}
			if (this.names.amd) {
				paths = paths.concat(this.names.amd);
			}
			if (this.names.commonjs) {
				paths = paths.concat(this.names.commonjs);
			}
			return paths;
		});
		mainTemplate.plugin('hash', (hash: any) => {
			hash.update('umd');
			hash.update(`${this.names.root}`);
			hash.update(`${this.names.amd}`);
			hash.update(`${this.names.commonjs}`);
		});
	}
}

export default class ExternalDojoLoaderPlugin {
	private _externals: ExternalDep[];
	private name: string;
	private names: { [ type: string ]: string };
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

		if (typeof name === 'object' && !Array.isArray(name)) {
			this.name = name.root || name.amd || name.commonjs;
			this.names = name;
		} else {
			this.name = name;
			this.names = {
				commonjs: name,
				root: name,
				amd: name
			};
		}
		this.namedDefine = Boolean(options.namedDefine);
	}

	apply(compiler: Compiler) {
		const externals = this._externals || {};

		compiler.apply(new CopyWebpackPlugin(externals.reduce(
			(config, external) => typeof external === 'string' ? config : config.concat([ {
				from: `node_modules/${external.from}`,
				to: `externals/${external.to || external.from}`

			} ]),
			[] as { from: string, to: string }[]
		)));
		(<any> compiler).plugin('this-compilation', (compilation: Compilation) => {
			compilation.apply(new ExternalsWrapperPlugin({
				loaderMap: this.loaderMap,
				name: this.name,
				namedDefine: this.namedDefine
			}));
		});
	}
}
