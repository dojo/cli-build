import * as assert from 'intern/chai!assert';
import { describe, it, after } from 'intern!bdd';
import configureLoader from '../../src/configureLoader';
import global from '@dojo/shim/global';

describe('configureLoader', () => {
	after(() => {
		delete global.dojo2ExternalLoaderConfigPromise;
	});

	it('should set returned promise from callback on global', () => {
		const returned = Promise.resolve();
		configureLoader(() => returned);
		assert.strictEqual(global.dojo2ExternalLoaderConfigPromise, returned);
	});
});
