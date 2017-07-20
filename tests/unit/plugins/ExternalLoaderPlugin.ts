import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import * as path from 'path';
import Map from '@dojo/shim/Map';
import Compiler = require('../../support/webpack/Compiler');
import Compilation = require('../../support/webpack/Compilation');
import ExternalLoaderPlugin from '../../../src/plugins/ExternalLoaderPlugin';
import MockModule from '../../support/MockModule';
import { SinonSpy, stub } from 'sinon';

if (typeof __dirname === 'undefined') {
	(<any> global).__dirname = path.join(process.cwd(), 'src', 'plugins', 'external-dojo-loader');
}

describe('ExternalLoaderPlugin', () => {

	it('should apply created configuration to the compiler', () => {
		const mockModule = new MockModule('../../src/plugins/ExternalLoaderPlugin');
		mockModule.dependencies([
			'copy-webpack-plugin',
			'./ExternalLoaderUmdTemplatePlugin'
		]);
		const Plugin: typeof ExternalLoaderPlugin = mockModule.getModuleUnderTest().default;
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;
		const loadPlugin: SinonSpy = mockModule.getMock('./ExternalLoaderUmdTemplatePlugin').default;

		const compiler = new Compiler();
		const compilation = new Compilation();
		const pluginStub = stub(compiler, 'plugin', (...args: any[]) => {
			const callback = args[1];
			callback(compilation);
		});
		const externals = [
			'a',
			{ from: 'abc' },
			{ from: 'abc', to: 'def' }
		];
		const loaderMap = <any> {};
		const name = 'name';
		const namedDefine = false;
		const plugin = new Plugin({ externals, name, loaderMap, namedDefine });
		const expectedCopyArgs = [ { from: 'node_modules/abc', to: 'externals/abc' }, { from: 'node_modules/abc', to: 'externals/def' } ];

		plugin.apply(compiler);

		try {
			assert.equal(compiler.applied.length, 1);
			const copyArgs = copyMock.args[0][0];
			assert.deepEqual(copyArgs, expectedCopyArgs);

			assert.equal(compilation.applied.length, 1);
			assert.isTrue(pluginStub.calledOnce);
			assert.equal(pluginStub.args[0][0], 'this-compilation');
			assert.deepEqual(loadPlugin.args[0][0], { name, loaderMap, namedDefine });

			loadPlugin.reset();
			new Plugin({ externals, name, namedDefine}).apply(compiler);
			assert.instanceOf(loadPlugin.args[0][0].loaderMap, Map);

			loadPlugin.reset();
			new Plugin().apply(compiler);
			assert.isTrue(loadPlugin.calledOnce);
		} catch (error) {
			throw error;
		} finally {
			mockModule.destroy();
		}
	});
});
