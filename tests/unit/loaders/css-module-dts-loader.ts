import { beforeEach, afterEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import MockModule from '../../support/MockModule';
import * as sinon from 'sinon';

const cssFilePath = '/path/to/file.css';

const cssContent = `
	.foo: {
		color: red;
	}
`;

const tsContentWithCss = `
	import thing from 'place';
	import * as css from '${cssFilePath}';
`;

const tsContentWithoutCss = `
	import thing from 'place';
	import this from 'that';
`;

describe('css-module-dts-loader', () => {
	let loaderUnderTest: any;
	let mockModule: MockModule;
	let mockDTSGenerator: any;
	let mockUtils: any;
	let mockFs: any;
	let mockInstances: any;
	let sandbox: sinon.SinonSandbox;
	const async = () => () => null;
	let writeFile: sinon.SinonStub;
	const resourcePath = 'test/path';
	const dateNow = new Date();
	let instance: any;
	const defaultScope = { async, resourcePath};

	function getInstance() {
		return {
			files: {
				[ resourcePath ]: true
			}
		};
	}

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		writeFile = sandbox.stub();
		mockModule = new MockModule('../../src/loaders/css-module-dts-loader/loader');
		mockModule.dependencies([
			'typed-css-modules',
			'ts-loader/dist/instances',
			'loader-utils',
			'fs'
		]);
		mockDTSGenerator = mockModule.getMock('typed-css-modules');
		mockDTSGenerator.create = sandbox.stub().returns(Promise.resolve({ writeFile }));
		mockUtils = mockModule.getMock('loader-utils');
		mockUtils.getOptions = sandbox.stub();
		mockFs = mockModule.getMock('fs');
		mockFs.statSync = sandbox.stub().returns({ mtime: dateNow });
		mockInstances = mockModule.getMock('ts-loader/dist/instances');
		instance = getInstance();
		mockInstances.getTypeScriptInstance = sandbox.stub().returns({ instance });
		loaderUnderTest = mockModule.getModuleUnderTest().default;
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('should generate a dts file when query type is css', () => {
		mockUtils.getOptions.returns({
			type: 'css'
		});

		return new Promise((resolve, reject) => {
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isTrue(mockDTSGenerator.create.calledOnce);
							assert.isTrue(writeFile.calledOnce);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, cssContent);
		});
	});

	it('should not generate a dts file when css mtime has not changed', () => {
		mockUtils.getOptions.returns({
			type: 'css'
		});
		mockFs.statSync.reset();

		return new Promise((resolve, reject) => {
			loaderUnderTest.call(defaultScope, cssContent);
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isTrue(mockFs.statSync.calledTwice);
							assert.isTrue(mockDTSGenerator.create.calledOnce);
							assert.isTrue(writeFile.calledOnce);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, cssContent);
		});
	});

	it('should generate a dts file when css mtime has changed', () => {
		mockUtils.getOptions.returns({
			type: 'css'
		});
		mockFs.statSync.reset();
		mockFs.statSync.onSecondCall().returns({ mtime: new Date() });

		return new Promise((resolve, reject) => {
			loaderUnderTest.call(defaultScope, cssContent);
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isTrue(mockFs.statSync.calledTwice);
							assert.isTrue(mockDTSGenerator.create.calledTwice);
							assert.isTrue(writeFile.calledTwice);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, cssContent);
		});
	});

	it('should find css import declarations in ts files and generate dts', () => {
		mockUtils.getOptions.returns({
			type: 'ts'
		});

		return new Promise((resolve, reject) => {
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isTrue(mockDTSGenerator.create.calledOnce);
							assert.isTrue(mockDTSGenerator.create.firstCall.calledWith(cssFilePath));
							assert.isTrue(writeFile.calledOnce);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, tsContentWithCss);
		});
	});

	it('should remove file from ts-loader cache if instance name is passed', () => {
		mockUtils.getOptions.returns({
			type: 'ts',
			instanceName: 'test'
		});

		return new Promise((resolve, reject) => {
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isFalse(instance.files[resourcePath]);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, tsContentWithCss);
		});
	});

	it('should not generate dts files if no css imports are found', () => {
		mockUtils.getOptions.returns({
			type: 'ts',
			instanceName: 'test'
		});

		return new Promise((resolve, reject) => {
			mockFs.statSync.reset();
			loaderUnderTest.call({
				async() {
					return () => {
						try {
							assert.isFalse(mockInstances.getTypeScriptInstance.called);
							assert.isFalse(mockFs.statSync.called);
							assert.isFalse(mockDTSGenerator.create.called);
							resolve();
						}
						catch (e) {
							reject(e);
						}
					};
				},
				resourcePath
			}, tsContentWithoutCss);
		});
	});
});
