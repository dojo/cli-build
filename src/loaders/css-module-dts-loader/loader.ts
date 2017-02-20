import { createSourceFile, forEachChild, Node, ScriptTarget, SyntaxKind } from 'typescript';
const instances = require('ts-loader/dist/instances');
import { statSync } from 'fs';

import { resolve, dirname } from 'path';
const DtsCreator = require('typed-css-modules');
const { parseQuery } = require('loader-utils');
const creator: any = new DtsCreator({
	camelCase: true
});

type DTSFileData = {
	name: string;
	content: string;
}

const mTimeMap = new Map<string, Date>();

async function generateDTSFile(filePath: string) {
	const { mtime } = statSync(filePath);
	const lastMTime = mTimeMap.get(filePath);

	if (!lastMTime || mtime > lastMTime) {
		mTimeMap.set(filePath, mtime);
		const content = await creator.create(filePath, false, true);

		return await content.writeFile();
	}
	else {
		return true;
	}
}

async function checkNodeForCSSImport(node: Node): Promise<string | void> {
	if (node.kind === SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const dojoTSLoader = instances.getTypeScriptInstance({ instance: '0_dojo' });
			const parentFileName = node.getSourceFile().fileName;

			dojoTSLoader.instance.files[parentFileName] = false;

			const absoluteCssFileName = resolve(dirname(parentFileName), importPath);
			return await generateDTSFile(absoluteCssFileName);
		}
	}
}

async function checkNode(node: Node): Promise<any> {
	const promises: Promise<any | any[]>[] = [];
	switch (node.kind) {
		case SyntaxKind.SourceFile:
			forEachChild(node, (childNode: Node) => {
				promises.push(checkNode(childNode));
			});
			break;
		case SyntaxKind.ImportDeclaration:
			forEachChild(node, (childNode: Node) => {
				promises.push(checkNodeForCSSImport(childNode));
			});
			break;
	}

	await Promise.all(promises);
}

async function findCSSImports(sourceFile: Node): Promise<any> {
	const filePaths: DTSFileData[] = [];
	await checkNode(sourceFile);
	return filePaths;
}

const fileType = {
	css: 'css',
	ts: 'ts'
};

export default async function (this: any, content: string, sourceMap?: any): Promise<void> {
	const callback = this.async();
	const { type = fileType.ts }: { type: string } = parseQuery(this.query);

	switch (type) {
		case fileType.css:
			await generateDTSFile(this.resourcePath);
			break;
		case fileType.ts:
			const sourceFile = createSourceFile(this.resourcePath, content, ScriptTarget.Latest, true);
			await findCSSImports(sourceFile);
			break;
	}

	callback(null, content, sourceMap);
}
