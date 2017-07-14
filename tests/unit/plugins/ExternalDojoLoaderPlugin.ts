import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import * as path from 'path';
import Compiler = require('../../support/webpack/Compiler');
import ExternalDojoLoaderPlugin from '../../../src/plugins/ExternalDojoLoaderPlugin';
import MockModule from '../../support/MockModule';
import { SinonSpy } from 'sinon';

if (typeof __dirname === 'undefined') {
	(<any> global).__dirname = path.join(process.cwd(), 'src', 'plugins', 'external-dojo-loader');
}

describe('ExternalDojoLoaderPlugin', () => {
	it('should return config to include a loader if specified', () => {
		const plugin = new ExternalDojoLoaderPlugin();
		const htmlAssetsConfigWithDefault = plugin.createHtmlAssetsConfig({});
		const htmlAssetsConfigWithLoader = plugin.createHtmlAssetsConfig({ 'loader.js': {}}, 'loader.js');
		const htmlAssetsConfigWithMain = plugin.createHtmlAssetsConfig({ loader: { main: 'main' }}, 'loader');
		const htmlAssetsConfigWithRelocatedLoader = plugin.createHtmlAssetsConfig({
			'loader.js': { to: 'relocated.js' }
		}, 'loader.js');
		const htmlAssetsWithRelocatedLoaderAndMain = plugin.createHtmlAssetsConfig({
			loader: { to: 'relocated', main: 'main' }
		}, 'loader');

		function createConfig(path: string) {
			return {
				assets: [ `externals/${path}`, 'externals/requireExternals.js' ],
				append: false
			};
		}

		assert.deepEqual(htmlAssetsConfigWithDefault, createConfig('dojo/dojo.js'));
		assert.deepEqual(htmlAssetsConfigWithLoader, createConfig('loader.js'));
		assert.deepEqual(htmlAssetsConfigWithMain, createConfig('loader/main.js'));
		assert.deepEqual(htmlAssetsConfigWithRelocatedLoader, createConfig('relocated.js'));
		assert.deepEqual(htmlAssetsWithRelocatedLoaderAndMain, createConfig('relocated/main.js'));
	});

	it('should check for a loader module', () => {
		const plugin = new ExternalDojoLoaderPlugin();
		const loader = plugin.determineLoaderModule({
			'noLoader': {},
			'loader': { hasLoader: true }
		});

		const undefinedLoader = plugin.determineLoaderModule({
			'noLoader': {}
		});

		assert.equal(loader, 'loader');
		assert.isUndefined(undefinedLoader);
	});

	it('should determine where to copy the dependency', () => {
		const plugin = new ExternalDojoLoaderPlugin();
		const withTo = plugin.getDirectoryToCopyTo({ module: { to: 'dir' }}, 'module');
		const withoutTo = plugin.getDirectoryToCopyTo({ module: {} }, 'module');
		const withoutConfig = plugin.getDirectoryToCopyTo({}, 'module');

		assert.equal(withTo, 'externals/dir');
		assert.equal(withoutTo, 'externals/module');
		assert.equal(withoutConfig, 'externals/module');
	});

	it('should determine module IDs for dependencies that should be fetched and are not the loader module', () => {
		const plugin = new ExternalDojoLoaderPlugin();

		assert.equal(
			plugin.getMIDs({
				// Shouldn't be loaded despite property as this is the loader module
				loader: {
					loadImmediately: true
				},
				noConfig: <any> undefined,
				dontFetch: {},
				fetch: { loadImmediately: true },
				'fetch/path': { loadImmediately: true },
				'fetchWithExtension.js': { loadImmediately: true },
				fetchWithTo: { loadImmediately: true, to: 'to' },
				fetchWithToAndExtension: { loadImmediately: true, to: 'to.js' },
				fetchWithMain: { loadImmediately: true, main: 'main' }
			}, 'loader'),
			`'fetch', 'fetch/path', 'fetchWithExtension', 'to', 'to', 'fetchWithMain/main', '../src/main.js'`
		);
	});

	it('should create configuration for copying dependencies, a loader, and the bootstrapping script', () => {
		const plugin = new ExternalDojoLoaderPlugin();
		const externals = {
			module: { to: 'file.js' },
			'other/module': { main: 'main' }
		};

		const copyConfigNoLoader = plugin.createCopyConfig(externals);
		const copyConfigWithLoader = plugin.createCopyConfig(externals, 'module');

		const moduleCopyConfig = [
			{ from: 'node_modules/module', to: 'externals/file.js' },
			{ from: 'node_modules/other/module', to: 'externals/other/module' }
		];

		const bootstrapperConfig = (copyConfig: any[]) => {
			return {
				from: path.join(__dirname, '../templates/requireExternals.js'),
				to: 'externals/requireExternals.js',
				transform: copyConfig[2].transform
			};
		};

		assert.deepEqual(copyConfigWithLoader, [ ...moduleCopyConfig, bootstrapperConfig(copyConfigWithLoader) ]);
		assert.deepEqual(copyConfigNoLoader, [ ...moduleCopyConfig, bootstrapperConfig(copyConfigNoLoader), {
			from: path.join(__dirname, '../node_modules/dojo'), to: 'externals/dojo'
		}]);
	});

	it('should apply created configuration to the compiler', () => {
		const mockModule: MockModule = new MockModule('../../src/plugins/ExternalDojoLoaderPlugin');
		mockModule.dependencies([
			'copy-webpack-plugin',
			'html-webpack-include-assets-plugin'
		]);
		const Plugin: typeof ExternalDojoLoaderPlugin = mockModule.getModuleUnderTest().default;
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;
		const htmlMock: SinonSpy = mockModule.getMock('html-webpack-include-assets-plugin').ctor;

		const compiler = new Compiler();
		const externals = {
			module: { hasLoader: true },
			moduleTwo: true,
			moduleThree: [ 'one', 'two', 'three' ],
			moduleFour: { loadImmediately: true, main: 'sub/module' }
		};
		// The constructor transforms the non object dependencies into objects. Verify that the transformation
		// is the same as for the expected transformed values
		const convertedExternals = {
			module: { hasLoader: true},
			moduleTwo: {},
			moduleThree: { packages: [ 'one', 'two', 'three' ] },
			moduleFour: { loadImmediately: true, main: 'sub/module' }
		};
		const plugin = new Plugin({
			externals,
			externalConfig: {
				packages: [
					{ name: 'package', location: 'package' }
				]
			}
		});
		const expectedCopyArgs = plugin.createCopyConfig(convertedExternals, 'module');

		plugin.apply(compiler);

		try {
			assert.equal(compiler.applied.length, 2);
			const copyArgs = copyMock.args[0][0];
			assert.equal(typeof copyArgs[4].transform, 'function');

			assert.equal(
				copyArgs[4].transform('require(/* External Config */[ /* External Layer MIDs */ ])'),
				`require({"packages":[{"name":"package","location":"package"}]}, [ 'moduleFour/sub/module', '../src/main.js' ])`
			);

			// assign expected function to actual value so we can do a deep comparison of arguments
			copyArgs[4].transform = (<any> expectedCopyArgs[4]).transform;
			assert.deepEqual(copyArgs, expectedCopyArgs);

			assert.deepEqual(htmlMock.args[0][0], plugin.createHtmlAssetsConfig(convertedExternals, 'module'));
		} catch (error) {
			throw error;
		} finally {
			mockModule.destroy();
		}
	});
});
