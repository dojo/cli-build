import * as assert from 'intern/chai!assert';
import { describe, it, after } from 'intern!bdd';
import registerLoader, { injectScript } from '../../src/registerLoader';
import global from '@dojo/shim/global';
import { stub } from 'sinon';

describe('registerLoader', () => {
	after(() => {
		delete global.dojoExternalModulesLoader;
	});

	it('should provide global access to a loader', () => {
		assert.isDefined(global.dojoExternalModulesLoader);
		assert.isDefined(global.dojoExternalModulesLoader.load);
		assert.isDefined(global.dojoExternalModulesLoader.waitForActiveLoads);
	});

	it('should allow a script to be loaded', () => {
		const document = global.document;
		global.document = {
			createElement: stub(),
			body: {
				appendChild: stub()
			}
		};
		const eventListenerStub = stub();
		global.document.createElement.returns({
			addEventListener: eventListenerStub
		});
		eventListenerStub.onFirstCall().callsArg(1);

		return injectScript('path').then(() => {
			const { createElement, body } = global.document;
			global.document = document;
			assert.isTrue(createElement.calledOnce);
			assert.equal(createElement.args[0][0], 'script');
			assert.isTrue(body.appendChild.calledOnce);
			assert.isTrue(eventListenerStub.calledTwice);
		}).catch((error) => {
			global.document = document;
			throw error;
		});
	});

	it('should register and use a loader', () => {
		registerLoader('fake-modules', () => Promise.resolve((moduleIds: string[]) => Promise.resolve(moduleIds)));
		return global.dojoExternalModulesLoader.load('fake-modules', [ 'one', 'two', 'three', 'four' ])
			.then((modules: any[]) => {
				assert.deepEqual(modules, [ 'one', 'two', 'three', 'four' ]);
				global.dojoExternalModulesLoader.load('fake-modules', [ 'five', 'six' ]);
				return global.dojoExternalModulesLoader.waitForActiveLoads().then((modules: any[]) => {
					assert.deepEqual(modules, [ 'one', 'two', 'three', 'four', 'five', 'six' ]);
				});
			});
	});

	it('should throw an error if trying to load with an unregistered loader type', () => {
		assert.throws(() => {
			global.dojoExternalModulesLoader.load('un-registered', [ 'one', 'two' ]);
		}, /No loader configured for external dependencies of type: un-registered, failed to load one, two/ );
	});
});
