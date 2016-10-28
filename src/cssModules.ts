import * as fs from 'fs';
import * as path from 'path';
const postcss: any = require('postcss');
const cssModules: any = require('postcss-modules');
const read: any = require('read-file-stdin');
const globby: any = require('globby');
const async: any = require('async');
const mkdirp: any = require('mkdirp');
const chalk: any = require('chalk');

interface PostcssArgs {
	root: string;
	cssOut: string;
	tsOut: string;
}

function processFile(args: PostcssArgs, processor: any, file: string, done: Function): void {
	const outputPath: string = path.join(args.cssOut || '', path.basename(file));

	function execute(css: string, done: Function): void {
		function complete(result: any) {
			if (typeof result.warnings === 'function') {
				result.warnings().forEach(function (warning: any) {
					console.warn(warning.toString());
				});
			}
			done(null, result);
		};

		const result: any = processor.process(css, { from: file, to: outputPath });

		if (typeof result.then === 'function') {
			result.then(complete).catch(done);
		}
		else {
			process.nextTick(complete.bind(null, result));
		}
	};

	function write(name: string, content: any, done: Function): void {
		async.parallel([
			async.apply(function(name: string, content: string, done: Function) {
				mkdirp(path.dirname(name), function(err: any) {
					if (err) {
						done(err);
					}
					else if (args.cssOut) {
						fs.writeFile(name, content, done);
						console.log(chalk.green(name));
					} else {
						done();
					}
				});
			}, name, content.css)
		], done);
	};

	async.waterfall([
		async.apply(read, file),
		execute,
		async.apply(write, outputPath)
	], done);
}

export default function modularize(root: string, cssOut: string, tsOut: string): Promise<any> {
	const processor: any = postcss([
		cssModules({
			getJSON: function(cssFileName: string, json: string) {
				if (!tsOut) {
					return;
				}
				const filename = path.basename(cssFileName, '.css');
				fs.writeFileSync(
					`${ tsOut || '.' }/${ filename }.ts`,
					`/* tslint:disable:object-literal-key-quotes quotemark whitespace */\nexport default ${ JSON.stringify(json) };\n`
				);
			}
		})
	]);

	const inputFiles: string[] = globby.sync(root);

	return new Promise((resolve, reject) => {
		async.each(inputFiles, processFile.bind(null, { root: root, cssOut: cssOut, tsOut: tsOut }, processor), function(err: any) {
			if (err) {
				reject(err);
				return;
			}
			console.log('\nDone!');
			resolve({});
		});
	});
}
