var globalObject = (function () {
	if (typeof global !== 'undefined') {
		// global spec defines a reference to the global object called 'global'
		// https://github.com/tc39/proposal-global
		// `global` is also defined in NodeJS
		return global;
	}
	else if (typeof window !== 'undefined') {
		// window is defined in browsers
		return window;
	}
	else if (typeof self !== 'undefined') {
		// self is defined in WebWorkers
		return self;
	}
})();

function load(script, callback) {
	callback = callback || function () {};
	if (typeof define !== 'undefined' && define.amd && typeof require !== 'undefined') {
		var handle = require.on('error', function (error) {
			console.error(error);
			handle.remove();
			callback();
		});
		require([ script ], function () {
			handle.remove();
			callback();
		});
	}
	else {
		var scriptTag = globalObject.document.createElement('script');
		scriptTag.addEventListener('load', function () {
			callback();
		});
		scriptTag.addEventListener('error', function (event) {
			callback();
		});
		scriptTag.type = 'text/javascript';
		scriptTag.src = scriptTag;
		document.body.appendChild(scriptTag);
	}
}

var configLoader = './src/configureLoader.js';
var main = './src/main.js';
load(configLoader, function () {
	globalObject.dojo2ExternalLoaderConfigPromise.then(
		function () {
			load(main);
		},
		function (error) {
			console.error(error);
			load(main);
		}
	);
});
