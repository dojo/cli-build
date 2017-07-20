# @dojo/cli-build

[![Build Status](https://travis-ci.org/dojo/cli-build.svg?branch=master)](https://travis-ci.org/dojo/cli-build)
[![codecov](https://codecov.io/gh/dojo/cli-build/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/cli-build)
[![npm version](https://badge.fury.io/js/%40dojo%2Fcli-build-webpack.svg)](https://badge.fury.io/js/%40dojo%2Fcli-build-webpack)

The official dojo 2 build command.

*WARNING* This is _beta_ software. While we do not anticipate significant changes to the API at this stage, we may feel the need to do so. This is not yet production ready, so you should use at your own risk. 

- [Usage](#usage)
- [Features](#features)
  - [Building](#building)
  - [Building a custom element](#building-a-custom-element)
  - [Eject](#eject)
- [How to I contribute?](#how-do-i-contribute)
  - [Installation](#installation)
  - [Testing](#testing)
- [Licensing information](#licensing-information)

## Usage

To use `@dojo/cli-build` in a single project, install the package:

```bash
npm install @dojo/cli-build-webpack
```

to use `@dojo/cli-build` in every project, install the project globally:

```bash
npm install -g @dojo/cli-build-webpack
```

## Features

`@dojo/cli-build-webpack` is an optional command for the [`@dojo/cli`](https://github.com/dojo/cli).

### Building

To build a Dojo 2 application for publishing:

```bash
dojo build webpack
```

This command will output the built files to the `dist` directory.  After running this command, you can open the `dist/index.html` file to see your application.

You can also build in watch mode, which will automatically rebuild your application when it changes:

```bash
dojo build webpack -w
```

`@dojo/cli-build-webpack` can be customized further. Use the help option to see everything you can do:

```bash
dojo build webpack --help
```

### Building a custom element

`@dojo/cli-build-webpack` can also build custom web elements as per the [custom web v1 specification](https://www.w3.org/TR/2016/WD-custom-elements-20161013/). Custom elements are built by providing the name of a [custom element descriptor](https://github.com/dojo/widget-core#web-components).

```bash
dojo build webpack --element=src/path/to/createTheSpecialElement.ts
```

This will output a `dist/the-special` directory containing:

* `the-special.js` - JavaScript file containing code specific to the `TheSpecial` widget.
* `widget-core.js` - JavaScript file containing shared widget code. This is separated to allow for better caching by the browser.
* `the-special.css` - CSS relating to the `TheSpecial` widget.
* `the-special.html` - HTML import file that will import all the scripts and styles needed to use the element.

If the source file does not follow the pattern `create[custom element]Element`, `@dojo/cli-build-webpack` cannot determine what the name of the custom element should be. In this case, you can specify the `--elementPrefix` option to explicitly name the element.

```bash
dojo build webpack --element=src/path/to/element.ts --elementPrefix=the-special
```

### Eject

Ejecting `@dojo/cli-build-webpack` will produce a `config/build-webpack/webpack.config.js` file. You can run build using webpack with:

```bash
node_modules/.bin/webpack --config=config/build-webpack/webpack.config.js
```

### Interop with External libraries

External libraries that can not be loaded normally via webpack, can be included in a Dojo 2 application by providing a loader and configuring certain options in the project's `.dojorc` file.
`.dojorc` is a JSON file that contains configuration for Dojo 2 CLI tasks. Configuration for the `dojo build` task can be provided under the
`build-webpack` property. External dependencies can be specified via a property called `externals` within the `build-webpack` config.
`externals` is an array. Each entry is an object that defines an external loader and any dependencies that should be loaded by that loader. Each entry has three properties:
* `type`: This is the unique key under which the loader will be registered.
* `loader`: This is the path to the file that registers the loader.
* `deps`: This is an array that defines the dependencies that should be loaded with this loader. Each entry in the `deps` array can either be a string, or an object. Each string value in the array should be the 'name' of a package or module that should be loaded with this loader. The `name` property of an object in this array serves the same purpose. In addition to `name`, each object must have a `from` property, and can optionally specify a `to` property. `from` is the path, relative to `node_modules`, from which this dependency should be copied. If `to` is not specified, then the dependency will be copied to `externals/${from}`. If `to` is specified then it will be copied to `externals/${to}`.

####Defining a Loader
The file specified by the `loader` property, should use the `@dojo/cli-build-webpack/registerLoader` module to register a loader.
 The default export of `registerLoader` is a function that takes a string and a callback function. The string is the unique key that identifies this loader, and should correspond to the value of the `type` property specified for this loader.
 The provided callback function will be called with one argument, a function called `loadScript`, and should return a promise that resolves to a load function.
  The load function takes an array of module IDs and returns a promise that resolves to an array of modules corresponding to the module IDs. The `loadScript` function can be used to load any external scripts, and returns a promise that resolves when the script has been loaded.
  The path provided to `loadScript` will be relative to `src` in the built project. To load a Dojo 1 loader that had been copied to `externals/dojo/dojo.js`, for example, you could call `loadScript('../externals/dojo/dojo.js')`. The code below provides a simple example of using the `registerLoader` function to register a loader for Dojo 1 modules. It assumes that the Dojo loader is at the above mentioned path, and that the actual modules that will be loaded are located at `externals/third-party`

```typescript
import registerLoader from '@dojo/cli-build-webpack/registerLoader';
import Promise from '@dojo/shim/Promise';

registerLoader('dojo1', (loadScript): any => {
	return loadScript('../externals/dojo/dojo.js').then(() => {
		const require: (...args: any[]) => void = (<any> window).require;
		return (moduleIds: string[]): Promise<any[]> => new Promise((resolve) => {
			require({
				baseUrl: 'externals',
				packages: [
					{ location: 'third-party', name: 'third-party' },
					{ location: 'dojo', name: 'dojo' }
				]
			}, moduleIds, function () {
				resolve(Array.from(arguments));
			});
		});
	});
});
```

Types for any dependencies included in `externals` can be installed in `node_modules/@types` just like any other dependency.

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

## Licensing information

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
