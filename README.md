# @dojo/cli-build

[![Build Status](https://travis-ci.org/dojo/cli-build.svg?branch=master)](https://travis-ci.org/dojo/cli-build)
[![codecov](https://codecov.io/gh/dojo/cli-build/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/cli-build)
[![npm version](https://badge.fury.io/js/%40dojo%2Fcli-build-webpack.svg)](https://badge.fury.io/js/%40dojo%2Fcli-build-webpack)

The official dojo 2 build command.

*WARNING* This is beta software. It is not yet production ready, so you should use at your own risk.

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
npm install @dojo/cli-build
```

to use `@dojo/cli-build` in every project, install the project globally:

```bash
npm install -g @dojo/cli-build
```

## Features

`@dojo/cli-build` is an optional command for the [Dojo CLI](https://github.com/dojo/cli).

### Building

To build a Dojo 2 application for publishing:

```bash
dojo build
```

This command will output the built files to the `dist` directory.  After running this command, you can open the `dist/index.html` file to see your application.

You can also build in watch mode, which will automatically rebuild your application when it changes:

```bash
dojo build -w
```

`@dojo/cli-build-webpack` can be customized further. Use the help option to see everything you can do:

```bash
dojo build --help
```

### Building a custom element

`@dojo/cli-build-webpack` can also build custom web elements. Custom elements are built by providing the name of a [custom element descriptor](https://github.com/dojo/widget-core#web-components).

```bash
dojo build --element=src/path/to/createMySpecialElement.ts
```

This will output a `dist/my-special` directory containing:

* `my-special.js` - JavaScript file containing code specific to the `MySpecial` widget.
* `widget-core.js` - JavaScript file containing shared widget code. This is separated to allow for better caching by the browser.
* `my-special.css` - CSS relating to the `MySpecial` widget.
* `my-special.html` - HTML import file that will import all the scripts and styles needed to use the element.

If the source file does not follow the pattern `create[custom element]Element`, `@dojo/cli-build-webpack` cannot determine what the name of the custom element should be. In this case, you can specify the `--elementPrefix` option to explicitly name the element.

```bash
dojo build --element=src/path/to/element.ts --elementPrefix=my-special
```

### Eject

Ejecting `@dojo/cli-build-webpack` will produce a `config/build-webpack/webpack.config.js` file. You can run build using webpack with:

```bash
node_modules/.bin/webpack --config=config/build-webpack/webpack.config.js
```

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