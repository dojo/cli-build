import { Command, Helper } from '@dojo/cli/interfaces';
import { Argv } from 'yargs';
const webpack: any = require('webpack');
const WebpackDevServer: any = require('webpack-dev-server');
const config: any = require('./webpack.config');

interface BuildArgs extends Argv {
	locale: string;
	messageBundles: string[];
	supportedLocales: string[];
	watch: boolean;
	port: number;
}

interface WebpackOptions {
	compress: boolean;
	stats: {
		colors: boolean
		chunks: boolean
	};
}

function watch(config: any, options: WebpackOptions, args: BuildArgs): Promise<any> {
	config.devtool = 'eval-source-map';
	Object.keys(config.entry).forEach((key) => {
		config.entry[key].unshift('webpack-dev-server/client?');
	});

	const compiler = webpack(config);
	const server = new WebpackDevServer(compiler, options);

	return new Promise((resolve, reject) => {
		const port = args.port || 9999;
		server.listen(port, '127.0.0.1', (err: Error) => {
			console.log(`Starting server on http://localhost:${port}`);
			if (err) {
				reject(err);
				return;
			}
		});
	});
}

function compile(config: any, options: WebpackOptions): Promise<any> {
	const compiler = webpack(config);
	return new Promise((resolve, reject) => {
		compiler.run((err: any, stats: any) => {
			if (err) {
				reject(err);
				return;
			}
			console.log(stats.toString(options.stats));
			resolve({});
		});
	});
}

const command: Command = {
	description: 'create a build of your application',
	register(helper: Helper) {
		helper.yargs.option('w', {
			alias: 'watch',
			describe: 'watch and serve'
		});

		helper.yargs.option('p', {
			alias: 'port',
			describe: 'port to serve on when using --watch',
			type: 'number'
		});

		helper.yargs.option('t', {
			alias: 'with-tests',
			describe: 'build tests as well as sources'
		});

		helper.yargs.option('locale', {
			describe: 'The default locale for the application',
			type: 'string'
		});

		helper.yargs.option('supportedLocales', {
			describe: 'Any additional locales supported by the application',
			type: 'array'
		});

		helper.yargs.option('messageBundles', {
			describe: 'Any message bundles to include in the build',
			type: 'array'
		});

		return helper.yargs;
	},
	run(helper: Helper, args: BuildArgs) {
		const options: WebpackOptions = {
			compress: true,
			stats: {
				colors: true,
				chunks: false
			}
		};

		if (args.watch) {
			return watch(config(args), options, args);
		}
		else {
			return compile(config(args), options);
		}
	}
};
export default command;
