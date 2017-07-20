import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import * as path from 'path';
import Compiler = require('../../support/webpack/Compiler');
import ExternalLoaderPlugin from '../../../src/plugins/ExternalLoaderPlugin';
import MockModule from '../../support/MockModule';
import { SinonSpy } from 'sinon';

if (typeof __dirname === 'undefined') {
	(<any> global).__dirname = path.join(process.cwd(), 'src', 'plugins', 'external-dojo-loader');
}

describe('ExternalDojoLoaderPlugin', () => {
	it('should apply created configuration to the compiler', () => {
		const mockModule: MockModule = new MockModule('../../src/plugins/ExternalLoaderPlugin');
		mockModule.dependencies([
			'copy-webpack-plugin'
		]);
		const Plugin: typeof ExternalLoaderPlugin = mockModule.getModuleUnderTest().default;
		const copyMock: SinonSpy = mockModule.getMock('copy-webpack-plugin').ctor;

		const compiler = new Compiler();
		const externals = [
			'a',
			{ from: 'abc' },
			{ from: 'abc', to: 'def' }
		];
		const plugin = new Plugin({
			externals
		});
		const expectedCopyArgs = [ { from: 'node_modules/abc', to: 'externals/abc' }, { from: 'node_modules/abc', to: 'externals/def' } ];

		plugin.apply(compiler);

		try {
			assert.equal(compiler.applied.length, 1);
			const copyArgs = copyMock.args[0][0];
			assert.deepEqual(copyArgs, expectedCopyArgs);
		} catch (error) {
			throw error;
		} finally {
			mockModule.destroy();
		}
	});
});
