import { deepAssign } from '@dojo/core/lang';
import { CldrData } from '@dojo/i18n/cldr/load';
import { Require } from '@dojo/interfaces/loader';
import * as fs from 'fs';
import * as path from 'path';
import ConcatSource = require('webpack-sources/lib/ConcatSource');
import NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
import Compiler = require('webpack/lib/Compiler');
import InjectModulesPlugin from './InjectModulesPlugin';
import getCldrUrls from './util/i18n';
import { hasExtension, isRelative, mergeUnique } from './util/main';

declare const require: Require;

export interface DojoI18nPluginOptions {
	/**
	 * The default locale to use as a fallback when the system locale is unsupported. Assumed to correspond to the
	 * default messages in any message bundles.
	 */
	defaultLocale: string;

	/**
	 * A list of message bundle paths. Messages for all supported locales will be included in the build.
	 * Unless the message bundle paths have an extension, a `ts` extension is assumed.
	 */
	messageBundles?: string[];

	/**
	 * The locales whose CLDR data and messages will be included in the main build.
	 */
	supportedLocales?: string[];
}

/**
 * @private
 * Return a list of locale-specific message bundle paths for the provided bundle ID and supported locales.
 * Only paths for existing modules are included.
 *
 * @param bundle
 * The default bundle module ID or path.
 *
 * @param supportedLocales
 * The list of supported locales.
 *
 * @return
 * The list of paths for the locale-specific message bundles.
 */
function getMessageLocalePaths(bundle: string, supportedLocales: string[]): string[] {
	const idSegments = bundle.split('/');
	const base = idSegments.slice(0, -1).join('/');
	const name = idSegments.slice(-1).join();
	const extension = hasExtension(name) ? '' : '.ts';

	return supportedLocales
		.map((locale: string) => path.join(base, locale, name))
		.filter((path: string) => {
			try {
				fs.accessSync(`${path}${extension}`);
				return true;
			}
			catch (error) {
				return false;
			}
		});
}

function isCldrLoadModule(path: string): boolean {
	return /cldr\/load\/webpack/.test(path);
}

/**
 * A webpack plugin that ensures CLDR data and locale-specific messages are available to webpack.
 */
export default class DojoI18nPlugin {
	defaultLocale: string;
	messageBundles?: string[];
	supportedLocales?: string[];

	constructor(options: DojoI18nPluginOptions) {
		const { defaultLocale, messageBundles, supportedLocales } = options;

		this.defaultLocale = defaultLocale;
		this.messageBundles = messageBundles;
		this.supportedLocales = supportedLocales;
	}

	/**
	 * Add messages and CLDR data to the build, and replace `@dojo/i18n/cldr/load` with a webpack-specific
	 * load module.
	 *
	 * @param compiler
	 * The current compiler.
	 */
	apply(compiler: Compiler) {
		const { defaultLocale, messageBundles, supportedLocales } = this;

		compiler.apply(new NormalModuleReplacementPlugin(/\/cldr\/load$/, '@dojo/i18n/cldr/load/webpack'));

		if (supportedLocales && messageBundles && messageBundles.length) {
			messageBundles.forEach(bundle => {
				const localePaths = getMessageLocalePaths(bundle, supportedLocales);

				if (localePaths.length) {
					compiler.apply(new InjectModulesPlugin({
						resourcePattern: new RegExp(bundle),
						moduleIds: localePaths
					}));
				}
			});
		}

		compiler.plugin('compilation', (compilation, data) => {
			const astMap = new Map();
			const parserQueue: string[] = [];
			const containsLoad: string[] = [];

			data.normalModuleFactory.plugin('before-resolve', (result: any, callback: any) => {
				if (!result) {
					return callback();
				}

				let request = isRelative(result.request) ? path.join(result.context, result.request) : result.request;

				const { contextInfo } = result;
				const issuer = contextInfo && contextInfo.issuer;
				if (issuer && isCldrLoadModule(request)) {
					containsLoad.push(issuer);
					parserQueue.push(issuer);
				}

				return callback(null, result);
			});

			data.normalModuleFactory.plugin('parser', (parser: any) => {
				parser.plugin('program', (ast: any) => {
					const path = parserQueue.shift();
					if (path && containsLoad.indexOf(path) > -1) {
						astMap.set(path, ast);
					}
				});
			});

			compilation.moduleTemplate.plugin('module', (source: any, module: any) => {
				if (isCldrLoadModule(module.userRequest)) {
					const locales = this._getLocales();
					const cldrData = containsLoad.map((path: string) => getCldrUrls(astMap.get(path)))
						.reduce(mergeUnique, [])
						.map((url: string) => {
							return locales.map((locale: string) => url.replace('{locale}', locale));
						})
						.reduce(mergeUnique, [])
						.map((mid: string) => require(mid) as CldrData)
						.reduce((cldrData: CldrData, source: CldrData) => {
							return deepAssign(cldrData, source);
						}, Object.create(null));

					astMap.clear();
					return new ConcatSource(`var __cldrData__ = ${JSON.stringify(cldrData)}`, '\n', source);
				}

				return source;
			});
		});
	}

	protected _getLocales(this: DojoI18nPlugin) {
		const { defaultLocale, supportedLocales } = this;
		const locales = [ defaultLocale ];
		return Array.isArray(supportedLocales) ? locales.concat(supportedLocales) : locales;
	}
}
