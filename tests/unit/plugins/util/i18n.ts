import { Require } from '@dojo/interfaces/loader';
import { resolve, sep } from 'path';
import getCldrUrls, { getLoadCallUrls, getLoadImports } from '../../../../src/plugins/util/i18n';
import { Program } from 'estree';

const { assert } = intern.getPlugin('chai');
const { describe, it } = intern.getInterface('bdd');

declare const require: Require;

const enum Asts {
	Complete = 'complete',
	Relative = 'relative',
	Sequence = 'sequence'
}

function loadAst(file: Asts = Asts.Complete) {
	return require(`../../../support/mocks/ast/cldr-${file}.json`) as Program;
}

describe('plugins/util/i18n', () => {
	describe('getLoadImports', () => {
		it('should return an array of variable names for `cldr/load` imports', () => {
			assert.sameMembers(getLoadImports(loadAst()), [ 'load' ]);
		});

		it('should parse sequence expressions', () => {
			assert.sameMembers(getLoadImports(loadAst(Asts.Sequence)), [ 'load' ]);
		});
	});

	describe('getLoadCallUrls', () => {
		it('should return an object with urls and variable names passed to `cldr/load`', () => {
			const importNames = [ 'load' ];
			assert.sameMembers(getLoadCallUrls(loadAst(), importNames), [
				'cldr-data/main/{locale}/ca-gregorian.json',
				'cldr-data/main/{locale}/dateFields.json',
				'cldr-data/main/{locale}/numbers.json',
				'cldr-data/main/{locale}/units.json',
				'cldr-data/supplemental/currencyData.json',
				'cldr-data/supplemental/likelySubtags.json',
				'cldr-data/supplemental/numberingSystems.json',
				'cldr-data/supplemental/plurals.json'
			]);
		});
	});

	describe('getCldrUrls', () => {
		it('should return an object with urls and variable names passed to `cldr/load`', () => {
			assert.sameMembers(getCldrUrls('/context', loadAst()), [
				'cldr-data/main/{locale}/ca-gregorian.json',
				'cldr-data/main/{locale}/dateFields.json',
				'cldr-data/main/{locale}/numbers.json',
				'cldr-data/main/{locale}/units.json',
				'cldr-data/supplemental/currencyData.json',
				'cldr-data/supplemental/likelySubtags.json',
				'cldr-data/supplemental/numberingSystems.json',
				'cldr-data/supplemental/plurals.json'
			]);
		});

		it('should resolve relative urls', () => {
			assert.sameMembers(getCldrUrls('/parent/context/mid.ts', loadAst(Asts.Relative)), [
				resolve('/parent/path/to/cldr/data.json'.replace(/\//g, sep))
			]);
		});
	});
});
