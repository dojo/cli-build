import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { stub } from 'sinon';
import getFeatures from '../../src/getFeatures';

registerSuite({
	name: 'getFeatures',

	'no features'() {
		assert.deepEqual(getFeatures({}), {});
	},

	'single feature set'() {
		assert.deepEqual(getFeatures({ features: 'ie11' }), {
			'arraybuffer': true,
			'blob': true,
			'microtasks': true,
			'es-observable': false,
			'es6-array-copywithin': false,
			'es6-array-fill': false,
			'es6-array-find': false,
			'es6-array-findindex': false,
			'es6-array-from': false,
			'es6-array-of': false,
			'es6-object-assign': false,
			'es6-map': false,
			'es6-math-acosh': false,
			'es6-math-clz32': false,
			'es6-math-imul': false,
			'es6-promise': false,
			'es6-set': false,
			'es6-string-codepointat': false,
			'es6-string-endswith': false,
			'es6-string-fromcodepoint': false,
			'es6-string-includes': false,
			'es6-string-normalize': false,
			'es6-string-padstart': false,
			'es6-string-padend': false,
			'es6-string-raw': false,
			'es6-string-repeat': false,
			'es6-string-startswith': false,
			'es6-symbol': false,
			'es6-weakmap': false,
			'es7-array-includes': false,
			'fetch': false,
			'filereader': true,
			'float32array': true,
			'formdata': true,
			'host-node': false,
			'host-browser': true,
			'node-buffer': false,
			'object-assign': false,
			'postmessage': true,
			'raf': true,
			'setimmediate': true,
			'xhr': true,
			'xhr2': true
		});
	},

	'two feature sets'() {
		assert.deepEqual(getFeatures({ features: [ 'ie11', 'node' ] }), {
			arraybuffer: true,
			blob: true,
			'es-observable': false,
			filereader: true,
			float32array: true,
			formdata: true,
			microtasks: true,
			postmessage: true,
			raf: true,
			setimmediate: true
		});
	},

	'not found feature set'() {
		const logStub = stub(console, 'log');
		const features = getFeatures({ features: [ 'ie11', 'foo' ] });
		logStub.restore();
		assert.deepEqual(features, { });
		assert.isTrue(logStub.calledOnce, 'log should have been called');
		assert.strictEqual(logStub.lastCall.args[0], 'Cannot resolve feature set:');
		assert.strictEqual(logStub.lastCall.args[1], 'foo');
	}
});
