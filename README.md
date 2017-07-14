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

### Interop with Dojo 1 libraries

Dojo 1 libraries, whether built or not, can be included in a Dojo 2 application by configuring certain options in the project's `.dojorc` file.
`.dojorc` is a JSON file that contains configuration for Dojo CLI tasks. Configuration for the `dojo build` task can be provided under the
`build-webpack` property. Dojo 1 dependencies can be specified via a property called `externals` within the `build-webpack` config.
`externals` is an object and the keys are paths, relative to `node_modules`, specifying the directories or files of the Dojo 1 dependencies that should
be included. Each value can take three possible types:
* `true`: Use this if none of the other options apply
* An array listing the package names that are in the dependency. This list is needed in order to tell the build process to leave the resolution of these
files up to Dojo. If any module from a package is imported within application code but not specified in this list, it will fail at runtime.
* An object with the following properties:
 * `packages`: An array of package names, this array serves the same purpose as providing an array as the value.
 * `hasLoader`: An optional flag to indicate that the specified layer includes a loader and a separate loader is not needed.
 * `main`: Can be provided if the external dependency is a folder. This is a path within the module to the file to be required. The folder or file
 itself will be required if this is not specified. This is only relevant if `loadImmediately` or `hasLoader` is `true`.
 * `to`: An alternate location for a dependency to be copied to. The location is relative to the `externals`
 folder. This can be useful if, for example, multiple built modules are being used that have shared dependencies, to ensure that only one copy
 of each is included in the final build.
 * `loadImmediately`: An optional flag that indicates this dependency should be loaded before the main application layer. The typical use case
 for this is to load a layer file so that its contained modules will be available to the application. If a dependency has the loader,
 `loadImmediately` is not needed as the loader script will be executed regardless.

Types for any dependencies included in `externals` can be installed in `node_modules/@types` just like any other dependency.

If the Dojo 1 library in question is a built layer, and contains all of its dependencies within the layer, then the `externals` config is all that's
needed to get a working build. However, in some cases not all dependencies are built into the layer file itself. This is often the case for i18n
resources, with some plugins, if modules are intentionally excluded from a build, if multiple layers have shared dependencies, etc. In this case some
additional configuration may be needed. To this end, the `externalConfig` property in the `.dojorc` configuration for `build-webpack` can be specified.
This property will be passed as is to the loader to configure it. The [`dojoConfig` documentation](https://dojotoolkit.org/documentation/tutorials/1.10/dojo_config/)
elaborates on the available configuration options.

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
