import { deepAssign } from '@dojo/core/lang';
import { CldrData } from '@dojo/i18n/cldr/load';

/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error?: any) => U | Thenable<U>): Thenable<U>;
}

export function isEventuallyRejected<T>(promise: Thenable<T>): Thenable<boolean> {
	return promise.then<any>(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediately() {
	throw new Error('unexpected code path');
}

/**
 * Load all supplemental CLDR data, and all CLDR data for the specified locale(s).
 */
export function fetchCldrData(locales: string | string[]): CldrData {
	const data = [
		'currencyData',
		'likelySubtags',
		'numberingSystems',
		'ordinals',
		'plurals',
		'timeData',
		'weekData'
	].reduce((data: any, name: string) => {
		deepAssign(data, require(`cldr-data/supplemental/${name}.json`));
		return data;
	}, Object.create(null));

	locales = Array.isArray(locales) ? locales : [ locales ];
	locales.forEach((locale: string) => {
		[ 'ca-gregorian', 'currencies', 'dateFields', 'numbers', 'timeZoneNames', 'units' ]
			.forEach((name: string) => {
				deepAssign(data, require(`cldr-data/main/${locale}/${name}.json`));
			});
	});

	return data;
}
