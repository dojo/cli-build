import * as ts from 'typescript';
// import { readFileSync } from 'fs';

import { resolve, dirname } from 'path';
const DtsCreator = require('typed-css-modules');
const { parseQuery } = require('loader-utils');
const creator: any = new DtsCreator({
	camelCase: true
});

async function generateDTSFile(filePath: string, filePaths: string[]) {
	const content = await creator.create(filePath);
	await content.writeFile();
	// console.log('PRELOADER -> written DTS' + filePath);

	// emit file here
	filePaths.push(filePath + '.d.ts');
}

async function checkNodeForCSSImport(node: ts.Node, filePaths: string[]): Promise<string | void> {
	if (node.kind === ts.SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const parentFileName = node.getSourceFile().fileName;
			const absoluteCssFileName = resolve(dirname(parentFileName), importPath);
			return await generateDTSFile(absoluteCssFileName, filePaths);
		}
	}
}

async function checkNode(node: ts.Node, filePaths: string[]): Promise<any> {
	const promises: Promise<any | any[]>[] = [];
	switch (node.kind) {
		case ts.SyntaxKind.SourceFile:
			ts.forEachChild(node, (childNode: ts.Node) => {
				promises.push(checkNode(childNode, filePaths));
			});
			break;
		case ts.SyntaxKind.ImportDeclaration:
			ts.forEachChild(node, (childNode: ts.Node) => {
				promises.push(checkNodeForCSSImport(childNode, filePaths));
			});
			break;
	}

	await Promise.all(promises);
}

async function findCSSImports(sourceFile: ts.Node): Promise<any> {
	const filePaths: string[] = [];
	await checkNode(sourceFile, filePaths);
	return filePaths;
}

const fileType = {
	css: 'css',
	ts: 'ts'
};

export default async function (this: any, content: string, sourceMap?: any): Promise<void> {
	const callback = this.async();
	const { type = fileType.ts }: { type: string } = parseQuery(this.query);
	let filePaths: string[] = [];

	switch (type) {
		case fileType.css:
			console.log('PRELOADER -> CSS: ' + this.resourcePath);
			// generateDTSFile(this.resourcePath, filePaths);
			this.addDependency(this.resourcePath + '.d.ts');

			break;
		case fileType.ts:
			const sourceFile = ts.createSourceFile(this.resourcePath, content, ts.ScriptTarget.Latest, true);
			console.log('PRELOADER -> TS: ' + this.resourcePath);
			filePaths = await findCSSImports(sourceFile);

			filePaths.forEach((filePath) => {
				// check modified date
				// if css file not cached and not modified don't addDependency
				this.addDependency(filePath);
			});

			break;
	}

	callback(null, content, sourceMap);
}
