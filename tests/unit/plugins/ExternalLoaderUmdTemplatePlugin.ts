import { describe, it, afterEach, beforeEach } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import Map from '@dojo/shim/Map';
import Compilation = require('../../support/webpack/Compilation');
import ExternalLoaderUmdTemplatePlugin from '../../../src/plugins/ExternalLoaderUmdTemplatePlugin';
import { stub } from 'sinon';
const ConcatSource = require('webpack-sources').ConcatSource;
const OriginalSource = require('webpack-sources').OriginalSource;

let mockTemplate: any = {
	applyPluginsWaterfall: stub(),
	plugin: () => {}
};
describe('ExternalLoaderUmdTemplatePlugin', () => {
	beforeEach(() => {
		mockTemplate.applyPluginsWaterfall.returnsArg(1);
	});

	afterEach(() => {
		mockTemplate.applyPluginsWaterfall.reset();
		if (mockTemplate.plugin.restore) {
			mockTemplate.plugin.restore();
		}
	});

	it('should serialize object accessors', () => {
		assert.equal(ExternalLoaderUmdTemplatePlugin.accessorToObjectAccess([ 'a', 'b', 'c' ]), '["a"]["b"]["c"]');
	});

	it('should create nullsafe code recursive property to recursively acess properties', () => {
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.accessorAccess('base', ['a', 'b', 'c']),
			'base["a"] = base["a"] || {}, base["a"]["b"] = base["a"]["b"] || {}, base["a"]["b"]["c"]'
		);
	});

	it('should map modules to the appropriate arguments', () => {
		assert.equal(ExternalLoaderUmdTemplatePlugin.externalsArguments(<any> [
			{ id: 1 },
			{ id: 2 },
			{ id: 3 }
			]), '__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_3__'
		);
	});

	it('should delegate to the template to determine the library name', () => {
		const hash = 'hash';
		const chunk = 'chunk';
		ExternalLoaderUmdTemplatePlugin.libraryName('library', mockTemplate, hash, chunk);
		ExternalLoaderUmdTemplatePlugin.libraryName([ 'library' ], mockTemplate, hash, chunk);
		ExternalLoaderUmdTemplatePlugin.libraryName([], mockTemplate, 'hash', 'chunk');

		assert.isTrue(mockTemplate.applyPluginsWaterfall.calledThrice);
		assert.deepEqual(mockTemplate.applyPluginsWaterfall.args, [
			[ 'asset-path', 'library', { hash, chunk } ],
			[ 'asset-path', 'library', { hash, chunk } ],
			[ 'asset-path', '', { hash, chunk } ]
		]);
	});

	it('should create a JSON array representation of external deps', () => {
		assert.equal(ExternalLoaderUmdTemplatePlugin.externalsDepsArray(<any> [
			{ request: 'one' },
			{ request: { amd: 'two' } }
		], mockTemplate, null, null), '["one", "two"]');
	});

	it('should create an access array for the root', () => {
		assert.equal(ExternalLoaderUmdTemplatePlugin.externalsRootArray(<any> [
			{ request: { root: 'root-string' } },
			{ request: { root: [ 'root', 'array' ]} },
			{ request: 'request-string' }
		], mockTemplate, null, null), 'root["root-string"], root["root"]["array"], root["request-string"]');
	});

	it('should throw an error for an undefined request', () => {
		assert.throws(() => {
			ExternalLoaderUmdTemplatePlugin.externalsRequireArray('type', <any> [ { request: undefined } ], mockTemplate, null, null);
		}, /Missing external configuration for type:type/);
	});

	it('should generate a require array for external modules', () => {
		const modules: any[] = [
			{ request: { amd: [ 'value' ]}},
			{ request: 'string-value' },
			{ request: 'optional-dependency', optional: true }
		];
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.externalsRequireArray('amd', modules, mockTemplate, null, null),
			'require("value"), require("string-value"), ' +
				'(function webpackLoadOptionalExternalModule() { try { return require("optional-dependency"); } catch(e) {} }())'
		);
	});

	it('should wrap code in a block that handles custom loaders', () => {
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad('block', ['a', 'b'], <any>  { 'a': [ { request: 'request-a-1' }, { request: 'request-a-2' } ], 'b': [ { request: 'request-b' } ] }),
			'if (typeof dojoExternalModulesLoader === "undefined") {\n' +
				'runWebpackUMD(root, factory);\n}\nelse {\n' +
				'dojoExternalModulesLoader.load(\'a\', [ ' +
				`'request-a-1', 'request-a-2' ]);\n` +
				`dojoExternalModulesLoader.load('b', [ 'request-b' ]);\n` +
				'dojoExternalModulesLoader.waitForActiveLoads()' +
				'.then(function (modules) {\nfactory = factory.bind' +
				'.apply(factory, [ null ].concat(modules));\n' +
				'runWebpackUMD(root, factory);\n})\n}\n' +
				'function runWebpackUMD(root, factory) {\n' +
				'block\n}\n'
		);
	});

	it('should wrap code in a umd compatible declaration', () => {
		const orderedModules: any[] = [
			{ id: 1 }
		];
		const orderedModulesString = ExternalLoaderUmdTemplatePlugin.externalsArguments(orderedModules);
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef('block', orderedModules),
			'(function webpackUniversalModuleDefinition(root, ' +
				'factory) {\nblock\n})(this, function(' +
				orderedModulesString +
				') {\nreturn '
		);
	});

	it('should wrap source code in a umd compatible declaration with custom loader support', () => {
		const modules: any[] = [
			{ id: 1, request: 'ignored' },
			{ id: 2, external: true, request: 'request' },
			{ id: 3, external: true, request: 'optional', optional: true },
			{ id: 4, external: true, request: 'loader' },
			{ id: 5, external: true, request: 'loader-too' }
		];

		const defaultExternals: any[] = modules.slice(1, 3);
		const map = new Map<string, string>();
		map.set('loader', 'loader');
		map.set('loader-too', 'loader');
		const customExternalLoaders: any = {
			'loader': [ modules[3], modules[4] ]
		};
		const orderedModules = [ modules[3], modules[4] ].concat(defaultExternals);
		const keys = [ 'loader' ];
		const source = 'source';

		let optionalExternals: any[] = [ modules[2] ];
		let requiredExternals: any[] = [ modules[1] ];
		const amdWithOptionalDeps = ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, { amd: 'name' }, false, mockTemplate, null, null);
		optionalExternals = [];
		requiredExternals = defaultExternals;
		const amdWithoutOptionalDeps = ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, { amd: 'name' }, false, mockTemplate, null, null);
		const cjs2 = ExternalLoaderUmdTemplatePlugin.writeCommonsjs2Code(defaultExternals, mockTemplate, null, null);
		const cjs = ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(defaultExternals, { commonjs: 'name' }, mockTemplate, null, null);

		const withOptionalDeps = new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					cjs2 + amdWithOptionalDeps + cjs,
					keys,
					customExternalLoaders
				), orderedModules
			), 'webpack/universalModuleDefinition'), source, ';\n})');

		const withoutOptionalDeps = new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					cjs2 + amdWithoutOptionalDeps + cjs,
					keys,
					customExternalLoaders
				), orderedModules
			), 'webpack/universalModuleDefinition'), source, ';\n})');

		assert.equal(
			ExternalLoaderUmdTemplatePlugin.wrapSource(
				source, <any> { modules }, <any> null, mockTemplate, false, map, { amd: 'name', commonjs: 'name' }, false
			).source(),
			withoutOptionalDeps.source()
		);

		assert.equal(
			ExternalLoaderUmdTemplatePlugin.wrapSource(
				source, <any> { modules }, <any> null, mockTemplate, true, map, { amd: 'name', commonjs: 'name' }, false
			).source(),
			withOptionalDeps.source()
		);
	});

	it('should use define when creating a named module', () => {
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.writeAmdCode(<any> [ { request: 'value' }], [], { amd: 'name' }, true, mockTemplate, null, null),
			'		define("name", [], function webpack' +
			'LoadOptionalExternalModuleAmd() {\n' +
			'			return factory(root["value"]);\n	}' +
			');\n'
		);
	});

	it('should use root name if commonjs name is not provided', () => {
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.writeCommonjsCode([], { root: 'root' }, mockTemplate, null, null),
			'	else if(typeof exports === "object")\n' +
			'		exports["root"] = factory();\n	else\n		' +
			'root["root"] = factory();\n'
		);
	});

	it('should use a fallback format if no name is provided', () => {
		assert.equal(
			ExternalLoaderUmdTemplatePlugin.writeCommonjsCode([], {}, mockTemplate, null, null),
			'	else {\n		var a = factory();\n' +
			'		for(var i in a) (typeof exports === "object"' +
			' ? exports : root)[i] = a[i];\n	}\n'
		);

		assert.equal(
			ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(<any> [ { request: 'request', id: 0 } ], {}, mockTemplate, null, null),
			'	else {\n		var a = typeof exports === "object" ? factory(require("request")) : factory(root["request"])' +
				';\n		for(var i in a) (typeof exports === "object"' +
			' ? exports : root)[i] = a[i];\n	}\n'
		);
	});

	it('should plug into compilation', () => {
		const modules: any[] = [
			{ id: 1, request: 'ignored' },
			{ id: 2, external: true, request: 'request' },
			{ id: 3, external: true, request: 'optional', optional: true },
			{ id: 4, external: true, request: 'loader' },
			{ id: 5, external: true, request: 'loader-too' }
		];

		const defaultExternals: any[] = modules.slice(1, 3);
		const map = new Map<string, string>();
		map.set('loader', 'loader');
		map.set('loader-too', 'loader');
		const customExternalLoaders: any = {
			'loader': [ modules[3], modules[4] ]
		};
		const orderedModules = [ modules[3], modules[4] ].concat(defaultExternals);
		const keys = [ 'loader' ];
		const source = 'source';

		let optionalExternals: any[] = [ modules[2] ];
		let requiredExternals: any[] = [ modules[1] ];
		const amdWithOptionalDeps = ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, { amd: 'name' }, false, mockTemplate, null, null);
		const cjs2 = ExternalLoaderUmdTemplatePlugin.writeCommonsjs2Code(defaultExternals, mockTemplate, null, null);
		const cjs = ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(defaultExternals, { commonjs: 'name' }, mockTemplate, null, null);

		const modifiedSource = new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					cjs2 + amdWithOptionalDeps + cjs,
					keys,
					customExternalLoaders
				), orderedModules
			), 'webpack/universalModuleDefinition'), source, ';\n})');

		const compilation = new Compilation();
		(<any> compilation).templatesPlugin = () => {};
		const templateStub = stub(compilation, 'templatesPlugin', (...args: any[]) => {
			assert.equal(
				args[1](source, { modules }, null).source(),
				modifiedSource.source()
			);
		});
		const pluginStub = stub(mockTemplate, 'plugin', (...args: any[]) => {
			if (args[0] === 'global-hash-paths') {
				assert.deepEqual(args[1]([]), [ 'name', 'name', 'name' ]);
			}
			else if (args[0] === 'hash') {
				const update = stub();
				args[1]({ update });
				assert.deepEqual(update.args, [ [ 'umd' ], [ 'name' ], [ 'name' ], [ 'name' ] ]);
			}
			else {
				throw new Error('Unexpected call to `plugin`');
			}
		});
		compilation.mainTemplate = mockTemplate;

		const plugin = new ExternalLoaderUmdTemplatePlugin({
			name: { amd: 'name', root: 'name', commonjs: 'name' },
			namedDefine: false,
			optionalAmdExternalAsGlobal: true,
			loaderMap: map
		});

		plugin.apply(compilation as any);
		assert.isTrue(templateStub.calledOnce);
		assert.isTrue(pluginStub.calledTwice);
	});

	it('should handle having only some properties defined for name', () => {
		const modules: any[] = [
			{ id: 1, request: 'ignored' },
			{ id: 2, external: true, request: 'request' },
			{ id: 3, external: true, request: 'optional', optional: true },
			{ id: 4, external: true, request: 'loader' },
			{ id: 5, external: true, request: 'loader-too' }
		];

		const defaultExternals: any[] = modules.slice(1, 3);
		const map = new Map<string, string>();
		map.set('loader', 'loader');
		map.set('loader-too', 'loader');
		const customExternalLoaders: any = {
			'loader': [ modules[3], modules[4] ]
		};
		const orderedModules = [ modules[3], modules[4] ].concat(defaultExternals);
		const keys = [ 'loader' ];
		const source = 'source';

		let optionalExternals: any[] = [ modules[2] ];
		let requiredExternals: any[] = [ modules[1] ];
		const amdWithOptionalDeps = ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, { amd: 'name' }, false, mockTemplate, null, null);
		const cjs2 = ExternalLoaderUmdTemplatePlugin.writeCommonsjs2Code(defaultExternals, mockTemplate, null, null);
		const cjs = ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(defaultExternals, { commonjs: 'name' }, mockTemplate, null, null);

		const modifiedSource = new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					cjs2 + amdWithOptionalDeps + cjs,
					keys,
					customExternalLoaders
				), orderedModules
			), 'webpack/universalModuleDefinition'), source, ';\n})'
		);

		const compilation = new Compilation();
		(<any> compilation).templatesPlugin = () => {};
		const templateStub = stub(compilation, 'templatesPlugin', (...args: any[]) => {
			assert.equal(
				args[1](source, { modules }, null).source(),
				modifiedSource.source()
			);
		});
		const pluginStub = stub(mockTemplate, 'plugin', (...args: any[]) => {
			if (args[0] === 'global-hash-paths') {
				assert.deepEqual(args[1]([]), [ 'name' ]);
			}
			else if (args[0] === 'hash') {
				const update = stub();
				args[1]({ update });
				assert.deepEqual(update.args, [ [ 'umd' ], [ 'undefined' ], [ 'undefined' ], [ 'name' ] ]);
			}
			else {
				throw new Error('Unexpected call to `plugin`');
			}
		});
		compilation.mainTemplate = mockTemplate;

		const plugin = new ExternalLoaderUmdTemplatePlugin({
			name: { commonjs: 'name' },
			namedDefine: false,
			optionalAmdExternalAsGlobal: true,
			loaderMap: map
		});

		plugin.apply(compilation as any);
		assert.isTrue(templateStub.calledOnce);
		assert.isTrue(pluginStub.calledTwice);
	});

	it('should handle being passed a string as its name', () => {
		const modules: any[] = [
			{ id: 1, request: 'ignored' },
			{ id: 2, external: true, request: 'request' },
			{ id: 3, external: true, request: 'optional', optional: true },
			{ id: 4, external: true, request: 'loader' },
			{ id: 5, external: true, request: 'loader-too' }
		];

		const defaultExternals: any[] = modules.slice(1, 3);
		const map = new Map<string, string>();
		map.set('loader', 'loader');
		map.set('loader-too', 'loader');
		const customExternalLoaders: any = {
			'loader': [ modules[3], modules[4] ]
		};
		const orderedModules = [ modules[3], modules[4] ].concat(defaultExternals);
		const keys = [ 'loader' ];
		const source = 'source';

		let optionalExternals: any[] = [ modules[2] ];
		let requiredExternals: any[] = [ modules[1] ];
		const amdWithOptionalDeps = ExternalLoaderUmdTemplatePlugin.writeAmdCode(optionalExternals, requiredExternals, { amd: 'name' }, false, mockTemplate, null, null);
		const cjs2 = ExternalLoaderUmdTemplatePlugin.writeCommonsjs2Code(defaultExternals, mockTemplate, null, null);
		const cjs = ExternalLoaderUmdTemplatePlugin.writeCommonjsCode(defaultExternals, { commonjs: 'name' }, mockTemplate, null, null);

		const modifiedSource = new ConcatSource(new OriginalSource(
			ExternalLoaderUmdTemplatePlugin.wrapInUmdDef(
				ExternalLoaderUmdTemplatePlugin.wrapInCustomLoad(
					cjs2 + amdWithOptionalDeps + cjs,
					keys,
					customExternalLoaders
				), orderedModules
			), 'webpack/universalModuleDefinition'), source, ';\n})'
		);

		const compilation = new Compilation();
		(<any> compilation).templatesPlugin = () => {};
		const templateStub = stub(compilation, 'templatesPlugin', (...args: any[]) => {
			assert.equal(
				args[1](source, { modules }, null).source(),
				modifiedSource.source()
			);
		});
		const pluginStub = stub(mockTemplate, 'plugin', (...args: any[]) => {
			if (args[0] === 'global-hash-paths') {
				assert.deepEqual(args[1]([]), [ 'name', 'name', 'name' ]);
			}
			else if (args[0] === 'hash') {
				const update = stub();
				args[1]({ update });
				assert.deepEqual(update.args, [ [ 'umd' ], [ 'name' ], [ 'name' ], [ 'name' ] ]);
			}
			else {
				throw new Error('Unexpected call to `plugin`');
			}
		});
		compilation.mainTemplate = mockTemplate;

		const plugin = new ExternalLoaderUmdTemplatePlugin({
			name: 'name',
			namedDefine: false,
			optionalAmdExternalAsGlobal: true,
			loaderMap: map
		});

		plugin.apply(compilation as any);
		assert.isTrue(templateStub.calledOnce);
		assert.isTrue(pluginStub.calledTwice);
	});
});
