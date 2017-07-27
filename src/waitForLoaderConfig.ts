import global from '@dojo/shim/global';
import 'dojo/shim/Promise';

export default function waitForLoaderConfig(path: string, timeout?: number) {
	return new Promise((resolve, reject) => {
		const scriptTag = global.document.createElement('script');
		scriptTag.type = 'text/javascript';
		scriptTag.src = path;
		document.body.appendChild(scriptTag);

		const startTime = new Date().getTime();
		function wait() {
			setTimeout(() => {
				if (global.dojo2ExternalLoaderConfigPromise) {
					global.dojo2ExternalLoaderConfigPromise.then(resolve, reject);
				}
				else {
					const currentTime = new Date().getTime();
					if (currentTime - startTime > (timeout || 60000)) {
						reject(new Error('Took too long for config to load'));
					}
					else {
						wait();
					}
				}
			}, 1000);
		}
	});
}
