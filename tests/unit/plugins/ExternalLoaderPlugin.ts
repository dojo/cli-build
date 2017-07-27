import { describe, it, beforeEach, afterEach } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import Compiler = require('../../support/webpack/Compiler');
import ExternalLoaderPlugin from '../../../src/plugins/ExternalLoaderPlugin';
import MockModule from '../../support/MockModule';
import { SinonSpy } from 'sinon';

let mockModule: MockModule;
let Plugin: typeof ExternalLoaderPlugin;
describe('ExternalLoaderPlugin', () => {

	beforeEach(() => {
		mockModule = new MockModule('../../src/plugins/ExternalLoaderPlugin');
		mockModule.dependencies([
			'copy-webpack-plugin',
			'html-webpack-include-assets-plugin'
		]);
		Plugin = mockModule.getModuleUnderTest().default;
	});

	afterEach(() => {
		mockModule.destroy();
	});

	it('should apply created configuration to the compiler', () => {
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;
		const assetsMock: SinonSpy = mockModule.getMock('html-webpack-include-assets-plugin').ctor;

		const compiler = new Compiler();
		const externals = [
			'a',
			{ from: 'abc', inject: true },
			{ from: 'abc', to: 'def', inject: true },
			{ from: 'abc', to: 'def', inject: 'main' },
			{ from: 'abc', inject: [ 'one', 'two', 'three', 'four' ]},
			{ from: 'abc' }
		];
		const expectedCopyArgs = [
			{ from: 'node_modules/abc', to: 'OUTPUT_PATH/abc' },
			{ from: 'node_modules/abc', to: 'OUTPUT_PATH/def' },
			{ from: 'node_modules/abc', to: 'OUTPUT_PATH/def' },
			{ from: 'node_modules/abc', to: 'OUTPUT_PATH/abc' },
			{ from: 'node_modules/abc', to: 'OUTPUT_PATH/abc' }
		];

		const expectedAssets = [
			'OUTPUT_PATH/abc', 'OUTPUT_PATH/def', 'OUTPUT_PATH/def/main', 'OUTPUT_PATH/abc/one', 'OUTPUT_PATH/abc/two',
			'OUTPUT_PATH/abc/three', 'OUTPUT_PATH/abc/four'
		];

		function test(outputPath: string, loaderConfigurer?: string) {
			const expectedCopy = expectedCopyArgs.map(({ from, to }) => ({ from, to: to.replace('OUTPUT_PATH', outputPath) }));
			const loaderCopy = { from: loaderConfigurer || '', to: `${outputPath}/${loaderConfigurer}` };
			const expectedAssetInclude = {
				assets: expectedAssets.map(asset => asset.replace('OUTPUT_PATH', outputPath)),
				append: false,
				hash: false,
				files: 'index.html'
			};

			if (loaderConfigurer) {
				expectedCopy.push(loaderCopy);
				expectedAssetInclude.assets.push(`${outputPath}/${loaderConfigurer}`);
			}
			assert.equal(compiler.applied.length, 2);
			const copyArgs = copyMock.args[0][0];
			const assetIncludeArgs = assetsMock.args[0][0];
			assert.deepEqual(copyArgs, expectedCopy);
			assert.deepEqual(assetIncludeArgs, expectedAssetInclude);

			copyMock.reset();
			assetsMock.reset();
			compiler.applied = [];
		}

		let plugin = new Plugin({ externals });
		plugin.apply(compiler);
		test('externals');

		const outputPath = 'output-path';
		const loaderConfigurer = 'path/loader-file.js';
		plugin = new Plugin({ externals, outputPath, loaderConfigurer });
		plugin.apply(compiler);
		test(outputPath, loaderConfigurer);
	});

	it('should allow a prefix to be specified for copied file paths', () => {
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;
		const assetsMock: SinonSpy = mockModule.getMock('html-webpack-include-assets-plugin').ctor;

		const compiler = new Compiler();
		const externals = [
			{ from: 'abc', to: 'def', inject: true }
		];
		let plugin = new Plugin({ externals, pathPrefix: 'prefix' });

		const expectedCopyArgs = [
			{ from: 'node_modules/abc', to: 'prefix/externals/def' }
		];

		const expectedAssetIncludeArgs = {
			assets: [ 'prefix/externals/def' ],
			append: false,
			hash: false,
			files: 'prefix/index.html'
		};

		plugin.apply(compiler);
		assert.equal(compiler.applied.length, 2);
		const copyArgs = copyMock.args[0][0];
		const assetIncludeArgs = assetsMock.args[0][0];
		assert.deepEqual(copyArgs, expectedCopyArgs);
		assert.deepEqual(assetIncludeArgs, expectedAssetIncludeArgs);
	});
});
