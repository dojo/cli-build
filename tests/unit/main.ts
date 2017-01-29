import { beforeEach, afterEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import MockModule from '../support/MockModule';
import { throwImmediately } from '../support/util';
import * as sinon from 'sinon';

describe('main', () => {

	let moduleUnderTest: any;
	let mockModule: MockModule;
	let mockWebpack: any;
	let mockWebpackConfig: any;
	let mockWebpackConfigModule: any;
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockModule = new MockModule('../../src/main');
		mockModule.dependencies(['./webpack.config', 'webpack', 'webpack-dev-server']);
		mockWebpack = mockModule.getMock('webpack');
		mockWebpackConfigModule = mockModule.getMock('./webpack.config');
		mockWebpackConfig = {
			entry: {
				'src/main': [
					'src/main.styl',
					'src/main.ts'
				]
			}
		};
		mockWebpackConfigModule.ctor.returns(mockWebpackConfig);
		moduleUnderTest = mockModule.getModuleUnderTest().default;
		sandbox.stub(console, 'log');
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('should register supported arguments', () => {
		const options = sandbox.stub();
		moduleUnderTest.register(options);
		assert.deepEqual(
			options.firstCall.args,
			[ 'w', { alias: 'watch', describe: 'watch and serve' } ]
		);
		assert.deepEqual(
			options.secondCall.args,
			[ 'p', { alias: 'port', describe: 'port to serve on when using --watch', type: 'number' }],
		);
		assert.deepEqual(
			options.thirdCall.args,
			[ 't', { alias: 'with-tests', describe: 'build tests as well as sources' }]
		);
		assert.deepEqual(
			options.args[3],
			[ 'locale', { describe: 'The default locale for the application', type: 'string' }],
		);
		assert.deepEqual(
			options.args[4],
			[ 'supportedLocales', { describe: 'Any additional locales supported by the application', type: 'array' }]
		);
		assert.deepEqual(
			options.args[5],
			[ 'messageBundles', { describe: 'Any message bundles to include in the build', type: 'array' }]
		);
	});

	it('should run compile and log results on success', () => {
		mockWebpack.run = sandbox.stub().yields(false, 'some stats');
		return moduleUnderTest.run({}, {}).then(() => {
			assert.isTrue(mockWebpack.run.calledOnce);
			assert.isTrue((<sinon.SinonStub> console.log).calledWith('some stats'));
		});
	});

	it('should run compile and reject on failure', () => {
		const compilerError = new Error('compiler error');
		mockWebpack.run = sandbox.stub().yields(compilerError, null);
		return moduleUnderTest.run({}, {}).then(
			throwImmediately,
			(e: Error) => {
				assert.isTrue(mockWebpack.run.calledOnce);
				assert.equal(e, compilerError);
			}
		);
	});

	it('should run watch, setting appropriate webpack options', () => {
		const mockWebpackDevServer = mockModule.getMock('webpack-dev-server');
		mockWebpackDevServer.listen = sandbox.stub().yields();
		moduleUnderTest.run({}, { watch: true });
		return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
			assert.isTrue(mockWebpackDevServer.listen.calledOnce);
			assert.isTrue((<sinon.SinonStub> console.log).firstCall.calledWith('Starting server on http://localhost:9999'));
			assert.equal(mockWebpackConfig.devtool, 'inline-source-map');
			assert.equal(mockWebpackConfig.entry['src/main'][0], 'webpack-dev-server/client?');
		});
	});

	it('should run watch and reject on failure', () => {
		const compilerError = new Error('compiler error');
		const mockWebpackDevServer = mockModule.getMock('webpack-dev-server');
		mockWebpackDevServer.listen = sandbox.stub().yields(compilerError);
		return moduleUnderTest.run({}, { watch: true }).then(
			throwImmediately,
			(e: Error) => {
				assert.isTrue(mockWebpackDevServer.listen.calledOnce);
				assert.equal(e, compilerError);
			}
		);
	});

	describe('i18n options', () => {
		it('should correctly set i18n options', () => {
			moduleUnderTest.run({}, {
				locale: 'en',
				supportedLocales: [ 'fr' ],
				messageBundles: [ 'nls/main' ]
			});
			return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
				assert.isTrue(mockWebpackConfigModule.ctor.calledWith({
					locale: 'en',
					supportedLocales: [ 'fr' ],
					messageBundles: [ 'nls/main' ]
				}), JSON.stringify(mockWebpack.ctor.args));
			});
		});

		it('should allow string values for supported locales and message bundles', () => {
			moduleUnderTest.run({}, {
				locale: 'en',
				supportedLocales: 'fr',
				messageBundles: 'nls/main'
			});
			return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
				assert.isTrue(mockWebpackConfigModule.ctor.calledWith({
					locale: 'en',
					supportedLocales: [ 'fr' ],
					messageBundles: [ 'nls/main' ]
				}), JSON.stringify(mockWebpack.ctor.args));
			});
		});
	});
});
