module.exports = function(grunt) {
	var requireExternals = 'templates/requireExternals.js';

	require('grunt-dojo2').initConfig(grunt, {
		staticDefinitionFiles: [ '**/*.d.ts', '**/*.html', '**/*.md' ],
		copy: {
			'staticDefinitionFiles-dev': {
				expand: true,
				cwd: 'src',
				src: [ '**/*.md' ],
				dest: '<%= devDirectory %>/src/'
			},
			'externalModuleLoader-dev': {
				expand: true,
				cwd: 'src',
				src: requireExternals,
				dest: '<%= devDirectory %>/src/'
			},
			'externalModuleLoader-dist': {
				expand: true,
				cwd: 'src',
				src: requireExternals,
				dest: '<%= distDirectory %>'
			}
		}
	});
	grunt.registerTask('ci', [
		'intern:node'
	]);

	grunt.registerTask('dev', grunt.config.get('devTasks').concat(['copy:externalModuleLoader-dev']));
	grunt.registerTask('dist', grunt.config.get('distTasks').concat(['copy:externalModuleLoader-dist']));
};
