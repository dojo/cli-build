import { readFileSync } from 'fs';
import { resolve, sep } from 'path';
import { createContext, runInContext } from 'vm';
import { Config } from 'webpack';
import MockModule from '../support/MockModule';
import { BuildArgs } from '../../src/main';

const webpackConfig = require('../../src/webpack.config');

const { assert } = intern.getPlugin('chai');
const { afterEach, beforeEach, describe, it } = intern.getInterface('bdd');

const basePath = process.cwd();
const configPath = resolve(basePath, '_build/src/webpack.config.js');
const configString = readFileSync(configPath);
const dirname = resolve(basePath, '_build/src');
let mockModule: MockModule;
let config: Config;

function start(cli = true, args: Partial<BuildArgs> = {}) {
	const mockPackageJson = {
		name: resolve(basePath, 'package.json'),
		mock: {
			name: '@namespace/complex$-package-name'
		}
	};

	mockModule = new MockModule('../../src/webpack.config');
	mockModule.dependencies([
		'./plugins/CoreLoadPlugin',
		'./plugins/ExternalLoaderPlugin',
		'./plugins/I18nPlugin',
		'copy-webpack-plugin',
		'extract-text-webpack-plugin',
		'html-webpack-plugin',
		'optimize-css-assets-webpack-plugin',
		'postcss-cssnext',
		'postcss-import',
		'webpack-bundle-analyzer-sunburst',
		'webpack/lib/IgnorePlugin',
		'webpack',
		mockPackageJson
	]);
	mockModule.start();

	const exports = {};
	const context: any = createContext({
		module: { exports },
		exports,
		process: {
			cwd: () => process.cwd(),
			env: { DOJO_CLI: cli }
		},
		require,
		__dirname: dirname
	});

	const js = configString.toString('utf8').replace(/\$\{packagePath\}/g, dirname.replace(/\\/g, '/').replace(/^[cC]:/, ''));
	runInContext(js, context);
	config = cli ? context.module.exports(args) : context.module.exports;
}

function getUMDCompatLoader(args = {}) {
	const config: Config = webpackConfig(args);
	return config.module.rules.reduce((value: any, rule: any) => {
		const loaders = rule.use || [];
		return loaders.reduce((result: any, loader: any) => {
			if (loader.loader === 'umd-compat-loader') {
				return loader;
			}
			return result;
		}, null) || value;
	}, null);
}

describe('webpack.config.ts', () => {
	afterEach(() => {
		mockModule && mockModule.destroy();
	});

	function runTests() {
		it('should load the banner for the banner plugin', () => {
			const bannerPath = resolve(basePath, 'src/banner.md');
			const expected = readFileSync(bannerPath, 'utf8');

			const webpack = mockModule.getMock('webpack');
			assert.isTrue(webpack.BannerPlugin.calledWith(expected));
		});
	}

	function runAppTests() {
		runTests();

		it('should output a UMD module to dist/', () => {
			assert.deepEqual(config.output, {
				chunkFilename: '[name].js',
				filename: '[name].js',
				jsonpFunction: 'dojoWebpackJsonp_namespace_complex_package_name',
				library: '[name]',
				libraryTarget: 'umd',
				path: resolve(basePath, './dist'),
				umdNamedDefine: true
			});
		});
	}

	describe('cli', () => {
		beforeEach(() => {
			start();
		});

		runAppTests();
	});

	describe('ejected', () => {
		beforeEach(() => {
			start(false);
		});

		runAppTests();
	});

	describe('umd-compat-loader', () => {
		it('can replace a require with promise-loader', () => {
			const { options: { imports } } = getUMDCompatLoader({});
			const result = imports('./TestModule', 'src/widgets');
			assert.equal(
				result,
				`promise-loader?global,src${sep}widgets${sep}TestModule!./TestModule`
			);
		});

		it('if bundle name passed, will include module in that bundle', () => {
			const { options: { imports } } = getUMDCompatLoader({
				bundles: {
					'my-bundle': [ 'src/widgets/TestModule' ]
				}
			});
			const result = imports('./TestModule', `src/widgets`);
			assert.equal(
				result,
				'promise-loader?global,my-bundle!./TestModule'
			);
		});
	});

	describe('custom elements', () => {
		beforeEach(() => {
			start(true, {
				element: 'src/createCustomElement.ts',
				elementPrefix: 'prefix'
			});
		});

		runTests();

		it('should output with a jsonp wrapper to dist/{prefix}', () => {
			assert.deepEqual(config.output, {
				chunkFilename: '[name].js',
				filename: '[name].js',
				jsonpFunction: 'dojoWebpackJsonp_namespace_complex_package_name',
				libraryTarget: 'jsonp',
				path: resolve(basePath, './dist/prefix')
			});
		});
	});

	describe('tslint', () => {
		function getTslintLoader() {
			const tsLintLoaders = config.module.rules.filter((rule) => rule.loader === 'tslint-loader');

			return tsLintLoaders[0];
		}

		it('will cause build errors on linting warnings if not watching or testing', () => {
			start(true, {});
			const loader = getTslintLoader();
			assert.isDefined(loader);
			assert.isTrue((<any> loader.options).emitErrors);
			assert.isTrue((<any> loader.options).failOnHint);
		});

		it('will not cause build errors on linting warnings if watching', () => {
			start(true, { watch: true });
			const loader = getTslintLoader();
			assert.isDefined(loader);
			assert.isUndefined((<any> loader.options).emitErrors);
			assert.isUndefined((<any> loader.options).failOnHint);
		});

		it('will not cause build errors on linting warnings if testing', () => {
			start(true, { withTests: true });
			const loader = getTslintLoader();
			assert.isDefined(loader);
			assert.isUndefined((<any> loader.options).emitErrors);
			assert.isUndefined((<any> loader.options).failOnHint);
		});
	});
});
