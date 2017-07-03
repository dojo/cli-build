import { BuildArgs } from './main';

export type FeatureMap = { [feature: string]: boolean };

const packagePath = process.env.DOJO_CLI ? '.' : '@dojo/cli-build-webpack';

/**
 * A simple wrapper for require to return a `FeatureMap` from JSON
 * @param mid MID to JSON file
 */
function resolve(mid: string): FeatureMap | undefined {
	try {
		const result: FeatureMap = require(mid);
		return result;
	}
	catch (e) { }
}

/**
 * Retrieve the largest set of non-conflicting features for the supplied feature sets.
 * @param args The arguments for the build
 */
export default function getFeatures(args: Partial<BuildArgs>): FeatureMap {
	// No feautres supplied in the args, bail with no static features
	if (!args.features) {
		return {};
	}

	const featureNames = Array.isArray(args.features) ? args.features : [ args.features ];
	const features = featureNames
		.map((name) => resolve(`${packagePath}/features/${name}.json`));

	if (!features.every((exists) => !!exists)) {
		features.forEach((exists, idx) => {
			if (!exists) {
				console.log('Cannot resolve feature set:', featureNames[idx]);
			}
		});
		return {};
	}

	// Reduce the array of loaded features to the largest set of features where the values don't
	// conflict with each other.  Once a value conflicts, it is removed from the feature map.
	const seenFeatures = new Set<string>();
	return (features as FeatureMap[]).reduce((previous, current) => {
		if (!current) {
			return previous;
		}
		Object.keys(current).forEach((key) => {
			if (!(key in previous) && !seenFeatures.has(key)) {
				seenFeatures.add(key);
				previous[key] = current[key];
			}
			else if (key in previous && previous[key] !== current[key]) {
				delete previous[key];
			}
		});
		return previous;
	}, {} as FeatureMap);
}
