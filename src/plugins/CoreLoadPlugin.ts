import * as path from 'path';
import * as ConcatSource from 'webpack-core/lib/ConcatSource';
import * as NormalModuleReplacementPlugin from 'webpack/lib/NormalModuleReplacementPlugin';
import { getBasePath, resolveMid } from './util';

interface ModuleIdMap {
	[id: string]: any;
}

/**
 * @private
 * Test whether a module was required with a relative mid and is relative to a module with a contextual require.
 *
 * @param module
 * The module to test.
 *
 * @param issuers
 * The userRequest paths for all modules with a contextual require.
 *
 * @return
 * True if the module should be included in the load map; false otherwise.3u
 */
function isContextual(module: any, issuers: string[]): boolean {
	const { rawRequest, userRequest } = module;
	const relative = /^\.(\.*)\//;
	const request = userRequest.replace(/\.[a-z0-9]+$/i, '');
	return relative.test(rawRequest) && issuers.some((issuer: string) => path.resolve(issuer, rawRequest) === request);
}

/**
 * @private
 * Remove the specified base path from the specified path. If the path begins with the base path, then also remove
 * the node_modules path segment.
 *
 * @param basePath
 * The base path.
 *
 * @param path
 * The path to modify.
 *
 * @return
 * The updated path.
 */
function stripPath(basePath: string, path: string): string {
	let resolved = path.replace(basePath + '/', '').replace(/\..*$/, '');

	if (path.indexOf(basePath) === 0) {
		resolved = resolved.replace('node_modules/', '');
	}

	return resolved;
}

/**
 * A webpack plugin that forces webpack to ignore `require` passed as a value, and replaces `@dojo/core/load` with a
 * custom function that maps string module IDs to webpack's numerical module IDs.
 */
export default class DojoLoadPlugin {
	/**
	 * Set up event listeners on the compiler and compilation. Register any module that uses a contextual require,
	 * replace use of `@dojo/core/load` with a custom load module, passing it a map of all dynamically-required
	 * module IDs.
	 *
	 * @param compiler
	 * The compiler instance.
	 */
	apply(compiler: any) {
		const idMap = Object.create(null) as ModuleIdMap;
		const basePath = compiler.options.resolve.root[0];
		const bundleLoader = /bundle.*\!/;
		const issuers: string[] = [];

		compiler.apply(new NormalModuleReplacementPlugin(/@dojo\/core\/load\.js/, resolveMid('@dojo/core/load/webpack')));

		compiler.parser.plugin('expression require', function (this: any): boolean {
			issuers.push(getBasePath(this.state.current.userRequest));
			this.state.current.meta.isPotentialLoad = true;
			return true;
		});

		compiler.plugin('compilation', (compilation: any) => {

			compilation.moduleTemplate.plugin('module', (source: any, module: any) => {
				if (module.meta && module.meta.isPotentialLoad) {
					const path = stripPath(basePath, module.userRequest);
					const require = `var require = (function () {
						var globalScope = typeof window === 'undefined' ? global : window;
						var toUrl = globalScope && globalScope.require && globalScope.require.toUrl
						&& globalScope.require.toUrl.bind(globalScope.require);
						var toAbsMid = globalScope && globalScope.require && globalScope.require.toAbsMid
						&& globalScope.require.toAbsMid.bind(globalScope.require);
						var newRequire = function () { return '${path}'; }; 
						newRequire.toUrl = toUrl;
						newRequire.toAbsMid = toAbsMid;
						return newRequire;
					})();`;
					return new ConcatSource(require, '\n', source);
				}
				const load = idMap['@dojo/core/load'] || { id: null };
				if (module.id === load.id) {
					const moduleMap = `var __modules__ = ${JSON.stringify(idMap)};`;
					return new ConcatSource(moduleMap, '\n', source);
				}
				return source;
			});

			compilation.plugin('optimize-module-ids', (modules: any[]) => {
				modules.forEach((module: any) => {
					const { rawRequest, userRequest } = module;

					if (rawRequest) {
						if (rawRequest.indexOf('@dojo') === 0 || !/^\W/.test(rawRequest)) {
							let modulePath = rawRequest;
							let lazy = false;
							if (bundleLoader.test(rawRequest)) {
								const afterLoader = userRequest.split('!')[1];
								modulePath = stripPath(basePath, afterLoader);
								lazy = true;
							}
							idMap[modulePath] = { id: module.id, lazy };
						}
						else if (isContextual(module, issuers)) {
							const modulePath = stripPath(basePath, userRequest);
							idMap[modulePath] = { id: module.id, lazy: false };
						}
					}
				});
			});
		});
	}
}
