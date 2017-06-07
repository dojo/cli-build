import { RootRequire } from '@dojo/interfaces/loader';
import * as mockery from 'mockery';
import * as sinon from 'sinon';

declare const require: RootRequire;
const dojoNodePlugin = 'intern/dojo/node';

function resolvePath(basePath: string, modulePath: string): string {
	return modulePath.replace('./', `${basePath}/`);
}

export function getBasePath(modulePath: string): string {
	const chunks = modulePath.split('/');
	chunks.pop();
	return chunks.join('/');
}

export function load(modulePath: string): any {
	const mid = `${dojoNodePlugin}!${modulePath}`;
	return require(mid);
}

export function unload(modulePath: string): void {
	const abs = require.toUrl(modulePath);
	const plugin = require.toAbsMid(dojoNodePlugin);
	require.undef(`${plugin}!${abs}`);
}

export default class Sandbox {
	private basePath: string;
	private mocks: any;
	private sandbox: sinon.SinonSandbox;

	constructor(basePath: string) {
		this.basePath = basePath;
		this.sandbox = sinon.sandbox.create();
		this.mocks = {};
	}

	dependencies(dependencies: string[]): void {
		dependencies.forEach((dependencyName) => {
			let dependency = load(resolvePath(this.basePath, dependencyName));
			const mock: any = {};

			for (let prop in dependency) {
				if (typeof dependency[prop] === 'function') {
					mock[prop] = function () {};
					this.sandbox.stub(mock, prop);
				} else {
					mock[prop] = dependency[prop];
				}
			}

			if (typeof dependency === 'function') {
				const ctor = this.sandbox.stub().returns(mock);
				Object.assign(ctor, mock);
				mockery.registerMock(dependencyName, ctor);
				mock.ctor = ctor;
			}
			else {
				mockery.registerMock(dependencyName, mock);
			}
			this.mocks[dependencyName] = mock;
		});
	}

	getMock(dependencyName: string): any {
		return this.mocks[dependencyName];
	}

	destroy(): void {
		this.sandbox.restore();
		mockery.deregisterAll();
		mockery.disable();
	}

	start() {
		mockery.enable({ warnOnUnregistered: false, useCleanCache: true });
	}
}
