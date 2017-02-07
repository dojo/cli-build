import * as ts from 'typescript';
import { resolve, dirname } from 'path';
const DtsCreator = require('typed-css-modules');
const creator: any = new DtsCreator({
	camelCase: true
});

async function generateDTSFile(filePath: string): Promise<void> {
	const content = await creator.create(filePath);
	await content.writeFile();
}

async function checkNodeForCSSImport(node: ts.Node): Promise<void> {
	if (node.kind === ts.SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const parentFileName = node.getSourceFile().fileName;
			const absoluteCssFileName = resolve(dirname(parentFileName), importPath);
			await generateDTSFile(absoluteCssFileName);
		}
	}
}

async function checkNode(node: ts.Node): Promise<any> {
	const promises: Promise<void | void[]>[] = [];
	switch (node.kind) {
		case ts.SyntaxKind.SourceFile:
			ts.forEachChild(node, (childNode: ts.Node) => {
				promises.push(checkNode(childNode));
			});
			break;
		case ts.SyntaxKind.ImportDeclaration:
			ts.forEachChild(node, (childNode: ts.Node) => {
				promises.push(checkNodeForCSSImport(childNode));
			});
			break;
	}

	return Promise.all(promises);
}

export default async function (this: any, content: string, sourceMap?: any): Promise<void> {
	const callback = this.async();
	let sourceFile = ts.createSourceFile(this.resourcePath, content, ts.ScriptTarget.Latest, true);
	await checkNode(sourceFile);
	callback(null, content, sourceMap);
}
