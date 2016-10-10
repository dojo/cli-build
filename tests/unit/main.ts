import { beforeEach, afterEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import MockModule from '../support/util';
import * as sinon from 'sinon';

describe('it should do something', () => {

	let moduleUnderTest: any;
	let mockModule: MockModule;
	let mockWebpack: any;
	let mockWebpackConfig: any;
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockModule = new MockModule('../../src/main');
		mockModule.dependencies(['./webpack.config.prod', 'webpack', 'webpack-dev-server']);
		mockWebpack = mockModule.getMock('webpack');
		mockWebpackConfig = mockModule.getMock('./webpack.config.prod');
		mockWebpackConfig.entry = [];
		moduleUnderTest = mockModule.getModuleUnderTest().default;
		sandbox.stub(console, 'log');
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('should run compile and log results on success', () => {
		mockWebpack.run = sandbox.stub().yields(false, 'some stats');

		return moduleUnderTest.run({}, {}).then(() => {
			assert.isTrue(mockWebpack.run.calledOnce);
			assert.isTrue((<any> console.log).calledWith('some stats'));
		});
	});

	it('should run compile and reject on failure', () => {
		const compilerError = new Error('compiler error');
		mockWebpack.run = sandbox.stub().yields(compilerError, null);

		return moduleUnderTest.run({}, {}).then(
			() => {
				throw new Error('unexpected path');
			},
			(e: Error) => {
				assert.isTrue(mockWebpack.run.calledOnce);
				assert.equal(e, compilerError);
			}
		);
	});

	it('should run watch and reject on failure', () => {
		const compilerError = new Error('compiler error');
		const mockWebpackDevServer = mockModule.getMock('webpack-dev-server');
		mockWebpackDevServer.listen = sandbox.stub().yields(compilerError);

		return moduleUnderTest.run({}, { watch: true }).then(
			() => {
				throw new Error('unexpected path');
			},
			(e: Error) => {
				assert.isTrue(mockWebpackDevServer.listen.calledOnce);
				assert.equal(e, compilerError);
			}
		);
	});
});
