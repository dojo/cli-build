import Chunk = require('webpack/lib/Chunk');
import Compilation = require('webpack/lib/Compilation');
import MainTemplate = require('webpack/lib/MainTemplate');
import Module = require('webpack/lib/Module');
import { Hash } from 'crypto';
import Source = require('webpack-sources/lib/Source');
const ConcatSource = require('webpack-sources').ConcatSource;
const OriginalSource = require('webpack-sources').OriginalSource;

export type Names = { root?: string | string[], commonjs?: string | string[], amd?: string | string[] };
export type Loader = { id: number; loader: string; request: string };
export type CustomLoaders = { [ loader: string ]: Loader[] };

/**
 * Wraps source in a UMD wrapper, that also delegates to the global `dojoExternalModuleLoader`, if it is defined, for
 * loading modules that are identified in the provided loaderMap.
 */
export default class ExternalLoaderUmdTemplatePlugin {
	static accessorToObjectAccess(accessor: string[]): string {
		return accessor.map(a => `[${JSON.stringify(a)}]`).join('');
	}

	static accessorAccess(base: string, accessor: string | string[]) {
		const accessorArray: string[] = ([] as string[]).concat(accessor);
		return accessorArray.map((a, idx) => {
			a = base + ExternalLoaderUmdTemplatePlugin.accessorToObjectAccess(accessorArray.slice(0, idx + 1));
			if (idx === accessorArray.length - 1) {
				return a;
			}
			return `${a} = ${a} || {}`;
		}).join(', ');
	}

	static externalsArguments(modules: { id: number }[]): string {
		return modules.map(module => `__WEBPACK_EXTERNAL_MODULE_${module.id}__`).join(', ');
	}

	static libraryName(library: string | string[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return JSON.stringify(ExternalLoaderUmdTemplatePlugin.replaceKeys(([] as string[]).concat(library).pop() || '', mainTemplate, hash, chunk));
	}

	static replaceKeys(str: string, mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return mainTemplate.applyPluginsWaterfall('asset-path', str, {
			hash,
			chunk
		});
	}

	static externalsDepsArray(modules: Module[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return `[${ExternalLoaderUmdTemplatePlugin.replaceKeys(modules.map(
			module => JSON.stringify(typeof module.request === 'object' ? module.request.amd : module.request)
		).join(', '), mainTemplate, hash, chunk)}]`;
	}

	static externalsRootArray(modules: Module[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return ExternalLoaderUmdTemplatePlugin.replaceKeys(modules.map(module => {
			const request = module.request;
			let root: string | string[] = [];
			if (typeof request === 'object') {
				root = request['root'];
			}
			else {
				root = request;
			}
			return `root${ExternalLoaderUmdTemplatePlugin.accessorToObjectAccess(([] as string[]).concat(root))}`;
		}).join(', '), mainTemplate, hash, chunk);
	}

	static externalsRequireArray(type: string, defaultExternals: Module[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return ExternalLoaderUmdTemplatePlugin.replaceKeys(defaultExternals.map(module => {
			let expr;
			let request = module.request;
			let requestStringOrArray: string | string[];
			if (typeof request === 'object') {
				requestStringOrArray = request[type];
			}
			else {
				requestStringOrArray = request;
			}
			if (typeof request === 'undefined') {
				throw new Error('Missing external configuration for type:' + type);
			}
			if (Array.isArray(requestStringOrArray)) {
				expr = `require(${JSON.stringify(requestStringOrArray[ 0 ])})` +
					ExternalLoaderUmdTemplatePlugin.accessorToObjectAccess(requestStringOrArray.slice(1));
			} else {
				expr = `require(${JSON.stringify(requestStringOrArray)})`;
			}
			if (module.optional) {
				expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
			}
			return expr;
		}).join(', '), mainTemplate, hash, chunk);
	}

	static wrapInCustomLoad(umdBlock: string, keys: string[], customExternalLoaders: CustomLoaders): string {
		const check = 'if (typeof dojoExternalModulesLoader === "undefined") {\nrunWebpackUMD(root, factory);\n}\nelse {\n';
		const load = keys.map((key) => {
			return `dojoExternalModulesLoader.load('${key}', [ ${customExternalLoaders[key].map(m => `'${m.request}'`).join(', ')} ]);\n`;
		}).join('');
		const wait = 'dojoExternalModulesLoader.waitForActiveLoads().then(function (modules) {\n' +
			'factory = factory.bind.apply(factory, [ null ].concat(modules));\n' +
			'runWebpackUMD(root, factory);\n})\n}\n';
		return check + load + wait + 'function runWebpackUMD(root, factory) {\n' + umdBlock + '\n}\n';
	}

	static wrapInUmdDef(customLoaderUmdBlock: string, orderedModules: { id: number }[]): string {
		return '(function webpackUniversalModuleDefinition(root, factory) {\n' + customLoaderUmdBlock + '\n' +
				'})(this, function(' + ExternalLoaderUmdTemplatePlugin.externalsArguments(orderedModules) + ') {\nreturn ';
	}

	static wrapSource(
		source: string,
		chunk: Chunk,
		hash: Hash,
		mainTemplate: MainTemplate,
		optionalAmdExternalAsGlobal: boolean,
		loaderMap: Map<string, string>,
		names: Names,
		namedDefine: boolean
	): Source {
		const externals = chunk.modules.filter(module => module.external);
		let defaultExternals = externals.filter(module => typeof module.request !== 'string' || !loaderMap.has(module.request));
		const customExternals = externals.reduce((previous, module) => {
			const request = typeof module.request === 'string' && module.request;
			const loader = request && loaderMap.get(request);
			if (request && loader) {
				return previous.concat([ { request, id: module.id, loader } ]);
			}
			return previous;
		}, [] as { id: number; request: string; loader: string }[]);
		const optionalExternals: Module[] = [];
		let requiredExternals: Module[] = [];
		if (optionalAmdExternalAsGlobal) {
			defaultExternals.forEach(module => {
				if (module.optional) {
					optionalExternals.push(module);
				} else {
					requiredExternals.push(module);
				}
			});
			defaultExternals = requiredExternals.concat(optionalExternals);
		} else {
			requiredExternals = defaultExternals;
		}

		const customExternalLoaders: { [ type: string ]: { id: number; request: string; loader: string }[] } = {};
		customExternals.forEach(module => {
			const loader = module.loader;
			customExternalLoaders[loader] = customExternalLoaders[loader] || [];
			customExternalLoaders[loader].push(module);
		});
		const keys = Object.keys(customExternalLoaders);
		const orderedExternalModules = keys.reduce((prev, next) => {
			return prev.concat(customExternalLoaders[next]);
		}, [] as (Loader | Module)[]);

		return new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					ExternalLoaderUmdTemplatePlugin.writeCommonsjs2Code(defaultExternals, mainTemplate, hash, chunk) +
					ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, names, namedDefine, mainTemplate, hash, chunk) +
					ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(defaultExternals, names, mainTemplate, hash, chunk),
					keys,
					customExternalLoaders
				), orderedExternalModules.concat(defaultExternals)
			), 'webpack/universalModuleDefinition'), source, ';\n})');
	}

	static writeAmdCode(optionalExternals: Module[], requiredExternals: Module[], names: Names, namedDefine: boolean, mainTemplate: MainTemplate, hash: Hash, chunk: Chunk) {
		const amdFactory = ExternalLoaderUmdTemplatePlugin.writeAmdFactory(optionalExternals, requiredExternals, mainTemplate, hash, chunk);
		const libraryName = names.amd && namedDefine === true && ExternalLoaderUmdTemplatePlugin.libraryName(names.amd, mainTemplate, hash, chunk);
		const deps = requiredExternals.length > 0 ?
			ExternalLoaderUmdTemplatePlugin.externalsDepsArray(requiredExternals, mainTemplate, hash, chunk) : '[]';
		return '		' + (libraryName ? `define(${libraryName}, ` : 'require(') + `${deps}, ${amdFactory});\n`;
	}

	static writeAmdFactory(optionalExternals: Module[], requiredExternals: Module[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk) {
		if (optionalExternals.length > 0) {
			const wrapperArguments = ExternalLoaderUmdTemplatePlugin.externalsArguments(requiredExternals);
			const factoryArguments = requiredExternals.length > 0 ?
				ExternalLoaderUmdTemplatePlugin.externalsArguments(requiredExternals) + ', ' + ExternalLoaderUmdTemplatePlugin.externalsRootArray(optionalExternals, mainTemplate, hash, chunk) :
				ExternalLoaderUmdTemplatePlugin.externalsRootArray(optionalExternals, mainTemplate, hash, chunk);
			return `function webpackLoadOptionalExternalModuleAmd(${wrapperArguments}) {\n` +
				`			return factory(${factoryArguments});\n` +
				'	}';
		} else {
			return 'factory';
		}
	}

	static writeCommonsjs2Code(defaultExternals: Module[], mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		return '	if(typeof exports === "object" && typeof module === "object")\n' +
			'		module.exports = factory(' +
			ExternalLoaderUmdTemplatePlugin.externalsRequireArray(
				'commonjs2', defaultExternals, mainTemplate, hash, chunk
			) + ');\n	else if(typeof define === "function" && define.amd)\n';
	}

	static writeCommonjsCode(defaultExternals: Module[], names: Names, mainTemplate: MainTemplate, hash: Hash, chunk: Chunk): string {
		const externalsRequireArray = ExternalLoaderUmdTemplatePlugin.externalsRequireArray(
			'commonjs', defaultExternals, mainTemplate, hash, chunk
		);
		const externalsRootArray = ExternalLoaderUmdTemplatePlugin.externalsRootArray(
			defaultExternals, mainTemplate, hash, chunk
		);
		const name = names.root || names.commonjs;
		return (name ?
				'	else if(typeof exports === "object")\n' +
				'		exports[' +
				ExternalLoaderUmdTemplatePlugin.libraryName(
					name, mainTemplate, hash, chunk
				) + `] = factory(${externalsRequireArray});\n` +
				'	else\n' +
				'		' +
				ExternalLoaderUmdTemplatePlugin.replaceKeys(
							ExternalLoaderUmdTemplatePlugin.accessorAccess('root', name),
							mainTemplate,
							hash,
							chunk
				) + ` = factory(${externalsRootArray});\n` :
				('	else {\n' +
				(defaultExternals.length > 0 ?
						`		var a = typeof exports === "object" ? factory(${externalsRequireArray}) : factory(${externalsRootArray});\n` :
						'		var a = factory();\n'
				) +
				'		for(var i in a) (typeof exports === "object" ? exports : root)[i] = a[i];\n' +
				'	}\n')
		);
	}

	private name?: string | string[];
	private names: Names;
	private namedDefine: boolean;
	private loaderMap: Map<string, string>;
	private optionalAmdExternalAsGlobal: boolean;

	constructor(options: {
		loaderMap: Map<string, string>,
		optionalAmdExternalAsGlobal?: boolean,
		namedDefine?: boolean,
		name?: string | string[] | Names;
	}) {
		const { name, loaderMap, namedDefine, optionalAmdExternalAsGlobal } = options;
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
		this.optionalAmdExternalAsGlobal = Boolean(optionalAmdExternalAsGlobal);
	}

	apply(compilation: Compilation & { templatesPlugin: (hook: string, callback: Function) => void }) {
		const mainTemplate = compilation.mainTemplate as MainTemplate;
		compilation.templatesPlugin(
			'render-with-entry', (source: string, chunk: Chunk, hash: Hash) =>
				ExternalLoaderUmdTemplatePlugin.wrapSource(
					source,
					chunk,
					hash,
					mainTemplate,
					this.optionalAmdExternalAsGlobal,
					this.loaderMap,
					this.names,
					this.namedDefine
				)
		);
		mainTemplate.plugin('global-hash-paths', (paths: string[]) => {
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
		mainTemplate.plugin('hash', (hash: Hash) => {
			hash.update('umd');
			hash.update(`${this.names.root}`);
			hash.update(`${this.names.amd}`);
			hash.update(`${this.names.commonjs}`);
		});
	}
}
