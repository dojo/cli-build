import { basename } from 'path';

module.exports = function (this: any, content: string, map: any): string {
	let response = content;
	const localsRexExp = /exports.locals = ({[.\s\S]*});/;
	const matches = content.match(localsRexExp);

	if (matches && matches.length > 0) {
		const localExports = JSON.parse(matches[1]);
		const pathName = basename(this.resourcePath, '.css');

		const output = {
			default: {
				classes: localExports,
				path: pathName
			}
		};

		response = content.replace(localsRexExp, `exports.locals = ${JSON.stringify(output)};`);
	}

	return response;
};
