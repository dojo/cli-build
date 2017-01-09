import * as path from 'path';

export interface DojoConfig {}

/**
 * Load the Dojo configuration at the specified path (relative to the current working directory).
 * If no config exists at the specified path, then a default object is returned.
 *
 * @param configPath
 * The path to the config file, relative to the current working directory.
 *
 * @return
 * The configuration module's default export, or a default object.
 */
export default function loadDojoConfig(configPath: string): DojoConfig {
	let config: DojoConfig = Object.create(null);

	try {
		config = require(path.resolve(process.cwd(), configPath));
	}
	catch (error) {}

	return config;
}
