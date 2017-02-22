import coreLoad from '@dojo/core/load';
import { Require } from '@dojo/interfaces/loader';
import { Program } from 'estree';
import { describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import getCldrUrls, { getLoadCallUrls, getLoadImports } from '../../../../src/plugins/util/i18n';

declare const require: Require;

function loadAst() {
	const url = require.toUrl('../../../support/mocks/ast/cldr.json');
	return coreLoad(url).then(([ json ]: [ Program ]) => json);
}

describe('plugins/util/i18n', () => {
	describe('getLoadImports', () => {
		it('should return an array of variable names for `cldr/load` imports', () => {
			return loadAst().then((ast) => {
				assert.sameMembers(getLoadImports(ast), [ 'load' ]);
			});
		});
	});

	describe('getLoadCallUrls', () => {
		it('should return an object with urls and variable names passed to `cldr/load`', () => {
			return loadAst().then((ast) => {
				const importNames = [ 'load' ];
				assert.sameMembers(getLoadCallUrls(ast, importNames), [
					'cldr-data/supplemental/likelySubtags.json',
					'cldr-data/main/{locale}/numbers.json',
					'cldr-data/main/{locale}/ca-gregorian.json',
					'cldr-data/main/{locale}/units.json'
				]);
			});
		});
	});

	describe('getCldrUrls', () => {
		it('should return an object with urls and variable names passed to `cldr/load`', () => {
			return loadAst().then((ast) => {
				assert.sameMembers(getCldrUrls(ast), [
					'cldr-data/supplemental/likelySubtags.json',
					'cldr-data/main/{locale}/numbers.json',
					'cldr-data/main/{locale}/ca-gregorian.json',
					'cldr-data/main/{locale}/units.json'
				]);
			});
		});
	});
});
