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
		const expectedAssetsTest = [
			'../_build/src/OUTPUT_PATH/abc', '../_build/src/OUTPUT_PATH/def', '../_build/src/OUTPUT_PATH/def/main',
			'../_build/src/OUTPUT_PATH/abc/one', '../_build/src/OUTPUT_PATH/abc/two',
			'../_build/src/OUTPUT_PATH/abc/three', '../_build/src/OUTPUT_PATH/abc/four'
		];

		function test(outputPath: string, loaderFile?: string) {
			const expectedCopy = expectedCopyArgs.map(({ from, to }) => ({ from, to: to.replace('OUTPUT_PATH', outputPath) }));
			const loaderCopy = { from: loaderFile || '', to: 'loadMain.js' };
			const expectedAssetInclude = {
				assets: expectedAssets.map(asset => asset.replace('OUTPUT_PATH', outputPath)),
				append: true,
				files: 'index.html'
			};
			const expectedAssetsIncludeTest = {
				assets: expectedAssetsTest.map(asset => asset.replace('OUTPUT_PATH', outputPath)),
				append: true,
				files: '../_build/src/index.html'
			};
			if (loaderFile) {
				expectedCopy.push(loaderCopy);
				expectedAssetInclude.assets.push('loadMain.js');
				expectedAssetsIncludeTest.assets.push('../_build/src/loadMain.js');
			}
			assert.equal(compiler.applied.length, 3);
			const copyArgs = copyMock.args[0][0];
			const assetIncludeArgs = assetsMock.args[0][0];
			const assetIncludeArgsTest = assetsMock.args[1][0];
			if (loaderFile) {
				(<any> loaderCopy).transform = copyArgs[copyArgs.length - 1].transform;
				assert.equal((<any> loaderCopy).transform('./src'), './src');
			}
			assert.deepEqual(copyArgs, expectedCopy);
			assert.deepEqual(assetIncludeArgs, expectedAssetInclude);
			assert.deepEqual(assetIncludeArgsTest, expectedAssetsIncludeTest);

			copyMock.reset();
			assetsMock.reset();
			compiler.applied = [];
		}

		let plugin = new Plugin({ externals });
		plugin.apply(compiler);
		test('externals');

		const outputPath = 'output-path';
		const loaderFile = 'loader-file.js';
		plugin = new Plugin({ externals, outputPath, loaderFile });
		plugin.apply(compiler);
		test(outputPath, loaderFile);
	});

	it('should allow a prefix to be specified for copied file paths', () => {
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;

		const compiler = new Compiler();
		const externals = [
			{ from: 'abc', to: 'def' }
		];
		const loaderFile = 'loader';
		let plugin = new Plugin({ externals, loaderFile, pathPrefix: 'prefix' });

		const expectedCopyArgs = [
			{ from: 'node_modules/abc', to: 'prefix/externals/def' },
			{ from: loaderFile, to: 'prefix/loadMain.js' }
		];

		plugin.apply(compiler);
		assert.equal(compiler.applied.length, 3);
		const copyArgs = copyMock.args[0][0];
		(<any> expectedCopyArgs[1]).transform = copyArgs[1].transform;
		assert.equal((<any> expectedCopyArgs[1]).transform('./src'), './');
		assert.deepEqual(copyArgs, expectedCopyArgs);
	});
});
