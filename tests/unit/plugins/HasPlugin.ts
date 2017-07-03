import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import HasPlugin from '../../../src/plugins/HasPlugin';
import Compiler = require('../../support/webpack/Compiler');

registerSuite({
	name: 'plugins/HasPlugin',

	basic() {
		const compiler = new Compiler();

		const plugin = new HasPlugin({});
		plugin.apply(compiler);
		assert.strictEqual(compiler.plugins['compilation'].length, 2, 'injects two compilation plugins');
	}
});
