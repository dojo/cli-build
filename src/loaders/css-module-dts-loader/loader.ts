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

type Webpack = {
	resourcePath: string;
	async(): (error: Error | null, result: string, sourceMap?: string) => void;
}

const creator: DtsCreatorInstance = new DtsCreator();

const mTimeMap = new Map<string, Date>();

function generateDTSFile(filePath: string): Promise<void> {
	const { mtime } = statSync(filePath);
	const lastMTime = mTimeMap.get(filePath);

	if (!lastMTime || mtime > lastMTime) {
		mTimeMap.set(filePath, mtime);
		return creator.create(filePath, false, true).then((content) => {
			return content.writeFile();
		});
	}
	else {
		return Promise.resolve();
	}
}

function checkNodeForCSSImport(node: Node, instance?: TSLoaderInstances): Promise<void> {
	if (node.kind === SyntaxKind.StringLiteral) {
		const importPath = node.getText().replace(/\'|\"/g, '');
		if (/.css$/.test(importPath)) {
			const parentFileName = node.getSourceFile().fileName;

			if (instance) {
				instance.files[parentFileName] = false;
			}

			const absoluteCssFileName = resolve(dirname(parentFileName), importPath);
			return generateDTSFile(absoluteCssFileName);
		}
		else {
			return Promise.resolve();
		}
	}
	else {
		return Promise.resolve();
	}
}

function checkNode(node: Node, instance?: TSLoaderInstances): Promise<any> {
	const promises: Promise<void>[] = [];
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

	return Promise.all(promises);
}

const fileType = {
	css: 'css',
	ts: 'ts'
};

export default function (this: Webpack, content: string, sourceMap?: string): Promise<string> {
	const callback = this.async();
	const {
		type = fileType.ts,
		instanceName
	}: {
		type: string,
		instanceName: string | void
	} = getOptions(this);

	return new Promise((resolve, reject) => {
		switch (type) {
			case fileType.css:
				generateDTSFile(this.resourcePath).then(() => {
					callback(null, content, sourceMap);
					resolve(content);
				});
				break;
			case fileType.ts:
				const sourceFile = createSourceFile(this.resourcePath, content, ScriptTarget.Latest, true);
				let instance: TSLoaderInstances | undefined = undefined;

				if (instanceName) {
					const tsInstances = instances.getTypeScriptInstance({ instance: instanceName });
					instance = tsInstances.instance;
				}

				checkNode(sourceFile, instance).then(() => {
					callback(null, content, sourceMap);
					resolve(content);
				});
				break;
		}
	});
}
