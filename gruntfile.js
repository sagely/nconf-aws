module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: { 
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        node: true
      },
      all: ['*.js']
    },

    jasmine_node: {
      options: {
        specNameMatcher: "./test/jasmine/*", // load only specs containing specNameMatcher
        projectRoot: "./test/jasmine/",
        requirejs: false,
        forceExit: true,
        jUnit: {
          report: false,
          savePath : "./test/reports/jasmine/",
          useDotNotation: true,
          consolidate: true
        }
      }
    },

    clean: ["node_modules"]
  });


  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jasmine-node');


  grunt.registerTask('jasmine', ['jasmine_node']);
  grunt.registerTask('test',    ['jshint']);

};
