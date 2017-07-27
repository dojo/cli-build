module.exports = function(grunt) {
	var loadMain = 'loadMain.js';

	require('grunt-dojo2').initConfig(grunt, {
		staticDefinitionFiles: [ '**/*.d.ts', '**/*.html', '**/*.md' ],
		copy: {
			'staticDefinitionFiles-dev': {
				expand: true,
				cwd: 'src',
				src: [ '**/*.md' ],
				dest: '<%= devDirectory %>/'
			},
			'MainModuleLoader-dev': {
				expand: true,
				cwd: 'src',
				src: loadMain,
				dest: '<%= devDirectory %>/'
			},
			'MainModuleLoader-dist': {
				expand: true,
				cwd: 'src',
				src: loadMain,
				dest: '<%= distDirectory %>'
			}
		}
	});
	grunt.registerTask('ci', [
		'intern:node'
	]);
	grunt.registerTask('dev', grunt.config.get('devTasks').concat(['copy:MainModuleLoader-dev']));
	grunt.registerTask('dist', grunt.config.get('distTasks').concat(['copy:MainModuleLoader-dist']));
};
