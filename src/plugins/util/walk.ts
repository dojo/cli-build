import { Node } from 'estree';

export type EnterFunction = (this: { skip(): void; }, node: Node, parent: Node | null, prop: string | undefined, index: number | undefined) => void;
export type LeaveFunction = (node: Node, parent: Node | null, prop: string | undefined, index: number | undefined) => void;

export interface WalkOptions {
	enter?: EnterFunction;
	leave?: LeaveFunction;
}

const context = {
	skip() {
		context.shouldSkip = true;
	},
	shouldSkip: false
};

const childKeysCache: { [type: string]: string[]; } = {};

function visit(node: Node | null, parent: Node | null, enter?: EnterFunction, leave?: LeaveFunction, prop?: string, index?: number) {
	if (!node) {
		return;
	}

	if (enter) {
		context.shouldSkip = false;
		enter.call(context, node, parent, prop, index);
		if (context.shouldSkip) {
			return;
		}
	}

	const keys = childKeysCache[node.type] ||
		(childKeysCache[node.type] = Object.keys(node).filter((key) => typeof (node as any)[key] === 'object'));

	keys.forEach((key) => {
		const value: Node | null = (node as any)[key];
		if (Array.isArray(value)) {
			value.forEach((element: Node, idx) => {
				visit(element, node, enter, leave, key, idx);
			});
		}
		else if (value && value.type) {
			visit(value, node, enter, leave, key);
		}
	});

	if (leave) {
		leave(node, parent, prop, index);
	}
}

/**
 * Walk a estree AST tree
 * @param node The root estree Node to start walking
 * @param param1 An object with an `enter` and `leave` properties
 */
export default function walk(node: Node, { enter, leave }: WalkOptions) {
	visit(node, null, enter, leave);
}
