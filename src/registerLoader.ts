import global from '@dojo/shim/global';
import Promise from '@dojo/shim/Promise';

export type RetrieveLoader = (loadScript: (file: string) => Promise<void>) => Promise<Load>;
export type Load = (modules: string[]) => Promise<any[]>;

const externalLoaders: { [ type: string ]: RetrieveLoader | Promise<Load> } = {};
const activeLoads: Promise<any[]>[] = [];

function isPromise<T>(anything: any): anything is Promise<T> {
	return anything && (<any> anything).then && typeof anything.then === 'function';
}

function injectScript(path: string) {
	return new Promise<void>((resolve, reject) => {
		const doc: Document = global.document;
		const scriptTag = doc.createElement('script');
		scriptTag.addEventListener('load', () => {
			resolve();
		});
		scriptTag.addEventListener('error', event => {
			console.error(`Error loading ${path}:`, event);
			reject(new Error(`Unable to load ${path}`));
		});
		scriptTag.src = path;
		doc.body.appendChild(scriptTag);
	});
}

global.dojoExternalModulesLoader = {
	load(type: string, modules: string[]) {
		const loaderPromiseOrRetriever = externalLoaders[type];
		if (loaderPromiseOrRetriever) {
			const loaderPromise = isPromise(loaderPromiseOrRetriever) ?
				loaderPromiseOrRetriever : loaderPromiseOrRetriever(injectScript);
			const loadedPromise = loaderPromise.then(load => load(modules));

			activeLoads.push(loadedPromise);

			return loadedPromise;
		}

		throw new Error(`No loader configured for external dependencies of type: ${type}, failed to load ${modules.join(', ')}`);
	},

	waitForActiveLoads() {
		return Promise.all(activeLoads).then((moduleArrays: any[][]) => {
			activeLoads.splice(0);
			return moduleArrays.reduce((prev, next) => prev.concat(next));
		});
	}
};

export default function registerLoader(type: string, retrieveLoader: RetrieveLoader) {
	externalLoaders[type] = retrieveLoader;
}
