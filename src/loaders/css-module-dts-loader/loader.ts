import { createSourceFile, forEachChild, Node, ScriptTarget, SyntaxKind } from 'typescript';
import { statSync } from 'fs';
import { resolve, dirname } from 'path';
const DtsCreator = require('typed-css-modules');
const { getOptions } = require('loader-utils');
const instances = require('ts-loader/dist/instances');

type TSLoaderInstances = {
	files: {
		[key: string]: boolean;
	}
}

type DtsResult = {
	writeFile(): Promise<void>;
}

type DtsCreatorInstance = {
	create(filePath: string, initialContents: boolean, clearCache: boolean): Promise<DtsResult>;
}

export type Webpack = {
	resourcePath: string;
	async(): (error: Error | null, result: string, sourceMap?: string) => void;
}

const creator: DtsCreatorInstance = new DtsCreator();

const mTimeMap = new Map<string, Date>();

function generateDTSFile(filePath: string): Promise<void> {
	return Promise.resolve().then(() => {
		const { mtime } = statSync(filePath);
		const lastMTime = mTimeMap.get(filePath);

		if (!lastMTime || mtime > lastMTime) {
			mTimeMap.set(filePath, mtime);
			return creator.create(filePath, false, true)
				.then((content) => content.writeFile());
		}
	});
}

function checkNodeForCSSImport(node: Node): string | void {
	if (node.kind === SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const parentFileName = node.getSourceFile().fileName;
			return resolve(dirname(parentFileName), importPath);
		}
	}
}

function checkNode(node: Node, filePaths: string[] = []): string[] {
	switch (node.kind) {
		case SyntaxKind.SourceFile:
			forEachChild(node, (childNode: Node) => {
				checkNode(childNode, filePaths);
			});
			break;
		case SyntaxKind.ImportDeclaration:
			forEachChild(node, (childNode: Node) => {
				const path = checkNodeForCSSImport(childNode);
				path && filePaths.push(path);
			});
			break;
	}
	return filePaths;
}

export default function (this: Webpack, content: string, sourceMap?: string) {
	const callback = this.async();
	const {
		type = 'ts',
		instanceName
	}: {
		type: string,
		instanceName?: string
	} = getOptions(this);

	switch (type) {
		case 'css':
			generateDTSFile(this.resourcePath).then(() => {
				callback(null, content, sourceMap);
			});
			break;
		case 'ts':
			const sourceFile = createSourceFile(this.resourcePath, content, ScriptTarget.Latest, true);
			const cssFilePaths = checkNode(sourceFile);

			if (cssFilePaths.length) {
				if (instanceName) {
					const tsInstances = instances.getTypeScriptInstance({ instance: instanceName });
					tsInstances.instance.files[this.resourcePath] = false;
				}

				const generationPromises = cssFilePaths.map((cssFilePath) => {
					return generateDTSFile(cssFilePath);
				});

				Promise.all(generationPromises).then(() => {
					callback(null, content, sourceMap);
				});
			}
			else {
				callback(null, content, sourceMap);
			}
			break;
	}
}
