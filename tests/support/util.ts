import * as mockery from 'mockery';
import * as sinon from 'sinon';

function load(modulePath: string): any {
	const dojoNode = 'intern/dojo/node!';
	const mid = `${dojoNode}${modulePath}`;
	return require(mid);
}

function resolvePath(basePath: string, modulePath: string): string {
	if (modulePath.indexOf('./') === 0) {
		modulePath = modulePath.replace('./', '');
		return `../../src/${modulePath}`;
	}
	return modulePath;
}

export default class MockModule {
	private moduleUnderTestPath: string;
	private mocks: any;
	private sandbox: sinon.SinonSandbox;

	constructor(moduleUnderTestPath: string) {
		this.moduleUnderTestPath = moduleUnderTestPath;
		this.sandbox = sinon.sandbox.create();
		this.mocks = {};
	}

	dependencies(dependencies: string[]) {
		dependencies.forEach((dependencyName) => {
			let dependency = load(resolvePath(this.moduleUnderTestPath, dependencyName));
			const mock: any = {};

			for (let prop in dependency) {
				if (typeof dependency[prop] === 'function') {
					mock[prop] = function () {};
					this.sandbox.stub(mock, prop);
				}
			}

			if (typeof dependency === 'function') {
				const ctor = this.sandbox.stub().returns(mock);
				mockery.registerMock(dependencyName, ctor);
				mock.ctor = ctor;
			} else {
				mockery.registerMock(dependencyName, mock);
			}
			mock.time = Date.now();
			this.mocks[dependencyName] = mock;
		});
	}

	getMock(dependencyName: string): any {
		return this.mocks[dependencyName];
	}

	getModuleUnderTest(): any {
		mockery.enable({ warnOnUnregistered: false });
		const allowable = require.toUrl(this.moduleUnderTestPath) + '.js';
		mockery.registerAllowable(allowable, true);
		return load(this.moduleUnderTestPath);
	}

	destroy() {
		const abs = require.toUrl(this.moduleUnderTestPath);
		const plugin = require.toAbsMid('intern/dojo/node');
		require.undef(`${plugin}!${abs}`);
		this.sandbox.restore();
		mockery.deregisterAll();
		mockery.disable();
	}
}
