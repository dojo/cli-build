import { createSourceFile, forEachChild, Node, ScriptTarget, SyntaxKind } from 'typescript';
import { statSync } from 'fs';
import { resolve, dirname } from 'path';
const DtsCreator = require('typed-css-modules');
const { getOptions } = require('loader-utils');
const creator: any = new DtsCreator({
	camelCase: true
});

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

async function checkNodeForCSSImport(node: Node, instance: any): Promise<string | void> {
	if (node.kind === SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const parentFileName = node.getSourceFile().fileName;
			debugger;
			if (instance) {
				instance.files[parentFileName] = false;
			}

			const absoluteCssFileName = resolve(dirname(parentFileName), importPath);
			return await generateDTSFile(absoluteCssFileName);
		}
	}
}

async function checkNode(node: Node, instance: any): Promise<any> {
	const promises: Promise<any | any[]>[] = [];
	switch (node.kind) {
		case SyntaxKind.SourceFile:
			forEachChild(node, (childNode: Node) => {
				promises.push(checkNode(childNode, instance));
			});
			break;
		case SyntaxKind.ImportDeclaration:
			forEachChild(node, (childNode: Node) => {
				promises.push(checkNodeForCSSImport(childNode, instance));
			});
			break;
	}

	await Promise.all(promises);
}

const fileType = {
	css: 'css',
	ts: 'ts'
};

export default async function (this: any, content: string, sourceMap?: any): Promise<void> {
	const callback = this.async();
	const {
		type = fileType.ts,
		instances,
		instanceName
	}: {
		type: string,
		instances: any | void,
		instanceName: string | void
	} = getOptions(this);

	switch (type) {
		case fileType.css:
			await generateDTSFile(this.resourcePath);
			break;
		case fileType.ts:
			let instance: any;
			debugger;
			if (instances && instanceName) {
				const tsLoaderInstance = instances.getTypeScriptInstance({ instanceName });
				if (tsLoaderInstance.error) {
					console.warn(tsLoaderInstance.error.message);
				}
				else {
					instance = tsLoaderInstance.instance;
				}
			}
			const sourceFile = createSourceFile(this.resourcePath, content, ScriptTarget.Latest, true);
			await checkNode(sourceFile, instance || null);
			break;
	}

	callback(null, content, sourceMap);
}
