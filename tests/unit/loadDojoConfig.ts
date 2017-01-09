import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import loadDojoConfig from '../../src/loadDojoConfig';

describe('loadDojoConfig', () => {
	it('should load the specified module if it exists', () => {
		const config = loadDojoConfig('tests/support/mocks/dojo.config.js');
		assert.deepEqual(config, {
			foo: 'foo',
			bar: 'bar'
		});
	});

	it('should load an empty object if no config exists', () => {
		const config = loadDojoConfig('path/to/nonexistent/dojo.config.js');
		assert.deepEqual(config, {}, 'A default config is returned.');
	});
});
