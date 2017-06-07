import { RootRequire } from '@dojo/interfaces/loader';
import * as mockery from 'mockery';
import Sandbox, { getBasePath, load, unload } from './Sandbox';

declare const require: RootRequire;

export default class MockModule {
	private moduleUnderTestPath: string;
	private sandbox: Sandbox;

	constructor(moduleUnderTestPath: string) {
		this.moduleUnderTestPath = moduleUnderTestPath;
		this.sandbox = new Sandbox(getBasePath(moduleUnderTestPath));
	}

	dependencies(dependencies: string[]): void {
		this.sandbox.dependencies(dependencies);
	}

	getMock(dependencyName: string): any {
		return this.sandbox.getMock(dependencyName);
	}

	getModuleUnderTest(): any {
		this.sandbox.start();
		const allowable = require.toUrl(this.moduleUnderTestPath) + '.js';
		mockery.registerAllowable(allowable, true);
		return load(this.moduleUnderTestPath);
	}

	destroy(): void {
		unload(this.moduleUnderTestPath);
		this.sandbox.destroy();
	}
}
