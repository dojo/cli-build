import global from '@dojo/shim/global';
import '@dojo/shim/Promise';

if (!global.dojo2ExternalLoaderConfigPromise) {
	global.dojo2ExternalLoaderConfigPromise = Promise.resolve();
}

export default function configureLoader(loaderConfigCallback: () => Promise<void>) {
	global.dojo2ExternalLoaderConfigPromise = loaderConfigCallback();
}
