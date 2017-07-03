import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import HasPlugin from '../../../src/plugins/HasPlugin';
import Compilation = require('../../support/webpack/Compilation');
import CompilationParams = require('../../support/webpack/CompilationParams');
import Compiler = require('../../support/webpack/Compiler');

registerSuite({
	name: 'plugins/HasPlugin',

	basic() {
		const compiler = new Compiler();
		const compilation = new Compilation();
		const params = new CompilationParams();

		const plugin = new HasPlugin({});
		plugin.apply(compiler);
		assert.strictEqual(compiler.plugins['compilation'].length, 1);

		compiler.mockApply('compilation', compilation, params);
		params.normalModuleFactory.mockApply('parser', params.parser);
	}
});
