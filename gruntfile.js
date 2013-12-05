'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: { 
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        globalstrict: true,
        node: true
      },
      pkg: {
        files: { src: [ '*.js' ] }
      },
      test: {
        options: {
          // jasmine globals
          globals: {
            jasmine    : false,
            isCommonJS : false,
            exports    : false,
            spyOn      : false,
            it         : false,
            xit        : false,
            expect     : false,
            runs       : false,
            waits      : false,
            waitsFor   : false,
            beforeEach : false,
            afterEach  : false,
            describe   : false,
            xdescribe  : false
          }
        },
        files: { src: [ 'test/**/*.js' ] }
      }
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
  grunt.registerTask('test',    ['jshint', 'jasmine']);

};
