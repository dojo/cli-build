/**
 * Strips the module name from the provided path.
 *
 * @param context
 * The context module path.
 *
 * @return
 * The base path.
 */
export function getBasePath(context: string): string {
	const base = context.split('/').slice(0, -1).join('/');
	return base === '' ? '/' : base;
}

const extensionPattern = /\.[a-z0-9]+$/i;

/**
 * Tests a file path for the presence of an extension. Note that the test only accounts for alphanumeric extensions.
 *
 * @param path
 * The file path to test.
 *
 * @return
 * `true` if the file path has an extension; false otherwise.
 */
export function hasExtension(path: string): boolean {
	return extensionPattern.test(path);
}
